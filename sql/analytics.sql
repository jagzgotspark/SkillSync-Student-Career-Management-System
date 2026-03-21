-- ============================================================
--  SkillSync: Student Career Management System
--  ANALYTICS QUERIES — Complex SQL Operations
--  Demonstrating: JOINs, Aggregations, Window Functions,
--                 Subqueries, FTS5, Set Operations
--  VIT Chennai | DBMS Project | 2025-2026
-- ============================================================

-- ============================================================
-- QUERY 1: LEADERBOARD — SQL WINDOW FUNCTION (RANK OVER)
-- Ranks all students by a weighted score using RANK() OVER()
-- Demonstrates: Window Functions, Multi-table JOIN, GROUP BY
-- ============================================================
SELECT
    s.student_id,
    u.name,
    s.department,
    s.year,
    s.cgpa,
    COUNT(DISTINCT ss.skill_id)       AS skill_count,
    COUNT(DISTINCT p.project_id)      AS project_count,
    COUNT(DISTINCT c.certificate_id)  AS cert_count,
    COUNT(DISTINCT a.application_id)  AS application_count,
    -- Weighted total points formula
    ROUND(
        (s.cgpa * 10) +
        (COUNT(DISTINCT ss.skill_id) * 3) +
        (COUNT(DISTINCT p.project_id) * 5) +
        (COUNT(DISTINCT c.certificate_id) * 4)
    , 1) AS total_points,
    -- RANK() window function: ranks all students in one pass
    RANK() OVER (
        ORDER BY
            (s.cgpa * 10) +
            (COUNT(DISTINCT ss.skill_id) * 3) +
            (COUNT(DISTINCT p.project_id) * 5) +
            (COUNT(DISTINCT c.certificate_id) * 4) DESC,
        s.cgpa DESC
    ) AS overall_rank,
    -- Department-level rank using PARTITION BY
    RANK() OVER (
        PARTITION BY s.department
        ORDER BY s.cgpa DESC
    ) AS dept_rank
FROM Students s
JOIN Users u                ON s.student_id = u.user_id
LEFT JOIN StudentSkills ss  ON s.student_id = ss.student_id
LEFT JOIN Projects p        ON s.student_id = p.student_id
LEFT JOIN Certificates c    ON s.student_id = c.student_id
LEFT JOIN Applications a    ON s.student_id = a.student_id
GROUP BY s.student_id, u.name, s.department, s.year, s.cgpa
ORDER BY total_points DESC;


-- ============================================================
-- QUERY 2: SKILL GAP ANALYSIS
-- Find missing skills for a student targeting a specific role
-- Demonstrates: Subquery, String manipulation, Set Difference
-- Replace :student_id = 1, :role_id = 2 with actual values
-- ============================================================
SELECT
    TRIM(value) AS required_skill,
    CASE
        WHEN TRIM(value) IN (
            SELECT sk.skill_name
            FROM StudentSkills ss
            JOIN Skills sk ON ss.skill_id = sk.skill_id
            WHERE ss.student_id = 1  -- Replace with actual student_id
        ) THEN 'Have ✅'
        ELSE 'Missing ❌'
    END AS status
FROM JobRoles,
     json_each(
         '["' || REPLACE(required_skills, ', ', '","') || '"]'
     )
WHERE role_id = 2;  -- Replace with actual role_id


-- ============================================================
-- QUERY 3: RESUME SCORE CALCULATION
-- Multi-factor weighted score across 4 dimensions
-- Demonstrates: Nested aggregates, COALESCE, ROUND, MIN()
-- ============================================================
SELECT
    s.student_id,
    u.name,
    s.cgpa,
    -- CGPA score: max 30 points
    ROUND((s.cgpa / 10.0) * 30, 1)                                    AS cgpa_score,
    -- Skills score: 3 pts each, max 10 skills = max 30 pts
    MIN(COUNT(DISTINCT ss.skill_id), 10) * 3                           AS skill_score,
    -- Projects score: 4 pts each, max 5 projects = max 20 pts
    MIN(COUNT(DISTINCT p.project_id), 5) * 4                          AS project_score,
    -- Certificates score: 4 pts each, max 5 certs = max 20 pts
    MIN(COUNT(DISTINCT c.certificate_id), 5) * 4                      AS cert_score,
    -- Total out of 100
    ROUND(
        (s.cgpa / 10.0) * 30 +
        MIN(COUNT(DISTINCT ss.skill_id), 10) * 3 +
        MIN(COUNT(DISTINCT p.project_id), 5) * 4 +
        MIN(COUNT(DISTINCT c.certificate_id), 5) * 4
    , 0) AS total_score
FROM Students s
JOIN Users u             ON s.student_id = u.user_id
LEFT JOIN StudentSkills ss  ON s.student_id = ss.student_id
LEFT JOIN Projects p        ON s.student_id = p.student_id
LEFT JOIN Certificates c    ON s.student_id = c.student_id
WHERE s.student_id = 1  -- Replace with actual student_id
GROUP BY s.student_id;


-- ============================================================
-- QUERY 4: JOB RECOMMENDATIONS
-- Filter roles by CGPA eligibility, order by skill match
-- Demonstrates: Correlated subquery, LIKE matching, ORDER BY
-- ============================================================
SELECT
    jr.role_id,
    jr.role_name,
    jr.salary_range,
    jr.location,
    jr.job_type,
    c.company_name,
    c.industry,
    -- Approximate skill match using string overlap
    ROUND(
        CAST(
            (LENGTH(jr.required_skills) -
             LENGTH(REPLACE(LOWER(jr.required_skills),
                            LOWER(COALESCE(match_data.skill_name, '')),
                            ''))) AS REAL
        ) * 100.0 / NULLIF(LENGTH(jr.required_skills), 0)
    , 0) AS match_percentage
FROM JobRoles jr
JOIN Companies c ON jr.company_id = c.company_id
LEFT JOIN (
    SELECT sk.skill_name
    FROM StudentSkills ss
    JOIN Skills sk ON ss.skill_id = sk.skill_id
    WHERE ss.student_id = 1  -- Replace with actual student_id
) AS match_data ON 1=1
WHERE jr.min_cgpa <= (
    SELECT cgpa FROM Students WHERE student_id = 1
)
GROUP BY jr.role_id
ORDER BY match_percentage DESC
LIMIT 6;


-- ============================================================
-- QUERY 5: PEER BENCHMARKING (PERCENT_RANK)
-- Shows a student's position within their department
-- Demonstrates: PERCENT_RANK() window function, PARTITION BY
-- ============================================================
SELECT
    s.student_id,
    u.name,
    s.department,
    s.cgpa,
    -- Percentile within department (0 = lowest, 1 = highest)
    ROUND(
        PERCENT_RANK() OVER (
            PARTITION BY s.department
            ORDER BY s.cgpa ASC
        ) * 100, 1
    ) AS cgpa_percentile,
    -- Total points percentile across all students
    ROUND(
        PERCENT_RANK() OVER (
            ORDER BY s.total_points ASC
        ) * 100, 1
    ) AS points_percentile
FROM Students s
JOIN Users u ON s.student_id = u.user_id
ORDER BY s.department, s.cgpa DESC;


-- ============================================================
-- QUERY 6: MOST IN-DEMAND SKILLS
-- Cross-references student skills with job requirements
-- Demonstrates: GROUP BY, COUNT, LEFT JOIN, ORDER BY
-- ============================================================
SELECT
    sk.skill_name,
    sk.category,
    COUNT(DISTINCT ss.student_id)   AS students_with_skill,
    COUNT(DISTINCT jr.role_id)      AS jobs_requiring_skill,
    -- Supply-Demand gap (negative = undersupply)
    COUNT(DISTINCT ss.student_id) - COUNT(DISTINCT jr.role_id) AS supply_gap
FROM Skills sk
LEFT JOIN StudentSkills ss ON sk.skill_id = ss.skill_id
LEFT JOIN JobRoles jr
       ON jr.required_skills LIKE '%' || sk.skill_name || '%'
GROUP BY sk.skill_id, sk.skill_name, sk.category
ORDER BY jobs_requiring_skill DESC, students_with_skill ASC;


-- ============================================================
-- QUERY 7: APPLICATION PIPELINE ANALYSIS
-- Full status breakdown per company and role
-- Demonstrates: Multi-table JOIN, GROUP BY, HAVING, COUNT
-- ============================================================
SELECT
    c.company_name,
    jr.role_name,
    COUNT(a.application_id)                               AS total_applications,
    SUM(CASE WHEN a.status = 'Applied'     THEN 1 ELSE 0 END) AS applied_count,
    SUM(CASE WHEN a.status = 'Shortlisted' THEN 1 ELSE 0 END) AS shortlisted_count,
    SUM(CASE WHEN a.status = 'Selected'    THEN 1 ELSE 0 END) AS selected_count,
    SUM(CASE WHEN a.status = 'Rejected'    THEN 1 ELSE 0 END) AS rejected_count,
    -- Selection rate %
    ROUND(
        SUM(CASE WHEN a.status = 'Selected' THEN 1.0 ELSE 0 END)
        / NULLIF(COUNT(a.application_id), 0) * 100
    , 1) AS selection_rate_pct
FROM Applications a
JOIN JobRoles jr  ON a.role_id = jr.role_id
JOIN Companies c  ON jr.company_id = c.company_id
GROUP BY c.company_id, jr.role_id
HAVING total_applications > 0
ORDER BY total_applications DESC;


-- ============================================================
-- QUERY 8: PLACEMENT PREDICTOR (Weighted Multi-Table Score)
-- Calculates placement probability vs department average
-- Demonstrates: Correlated subquery, AVG, multi-table aggregate
-- ============================================================
SELECT
    s.student_id,
    u.name,
    s.department,
    -- Individual weighted score
    ROUND(
        (s.cgpa / 10.0) * 35 +
        MIN(COALESCE((SELECT COUNT(*) FROM StudentSkills ss2 WHERE ss2.student_id = s.student_id), 0), 10) * 2.5 +
        MIN(COALESCE((SELECT COUNT(*) FROM Projects p2        WHERE p2.student_id  = s.student_id), 0), 5)  * 5.0 +
        MIN(COALESCE((SELECT COUNT(*) FROM Certificates c2    WHERE c2.student_id  = s.student_id), 0), 5)  * 2.0 +
        MIN(COALESCE((SELECT COUNT(*) FROM Applications a2    WHERE a2.student_id  = s.student_id), 0), 5)  * 1.0
    , 1) AS placement_score,
    -- Department average for comparison
    (SELECT ROUND(AVG(
        (s2.cgpa / 10.0) * 35 +
        MIN(COALESCE((SELECT COUNT(*) FROM StudentSkills ss3 WHERE ss3.student_id = s2.student_id),0),10)*2.5+
        MIN(COALESCE((SELECT COUNT(*) FROM Projects p3       WHERE p3.student_id  = s2.student_id),0),5)*5.0
     ), 1)
     FROM Students s2 WHERE s2.department = s.department
    ) AS dept_avg_score
FROM Students s
JOIN Users u ON s.student_id = u.user_id
ORDER BY placement_score DESC;


-- ============================================================
-- QUERY 9: FULL-TEXT SEARCH (FTS5 MATCH)
-- Sub-millisecond prefix search on job roles and projects
-- Demonstrates: FTS5 virtual table, MATCH operator
-- ============================================================

-- Search job roles by keyword (e.g., 'python', 'data', 'cloud')
SELECT
    jr.role_id,
    jr.role_name,
    jr.required_skills,
    jr.salary_range,
    c.company_name
FROM JobRoles_FTS fts
JOIN JobRoles jr ON fts.role_id = jr.role_id
JOIN Companies c  ON jr.company_id = c.company_id
WHERE JobRoles_FTS MATCH 'python*'   -- Prefix search (python, pyspark, etc.)
ORDER BY rank;                        -- FTS5 BM25 relevance ranking

-- Search student projects by tech stack keyword
SELECT
    p.project_id,
    p.title,
    p.description,
    p.tech_stack,
    u.name AS student_name,
    s.department
FROM Projects_FTS fts
JOIN Projects p ON fts.project_id = p.project_id
JOIN Students s ON p.student_id   = s.student_id
JOIN Users u    ON s.student_id   = u.user_id
WHERE Projects_FTS MATCH 'machine learning*'
ORDER BY rank;


-- ============================================================
-- QUERY 10: AUDIT LOG — Recent Activity per Student
-- Read the automated activity trail written by Triggers
-- Demonstrates: ORDER BY, LIMIT, CASE expression
-- ============================================================
SELECT
    log_id,
    timestamp,
    -- Human-readable action label
    CASE action
        WHEN 'UPDATE_CGPA'    THEN '🎓 CGPA Updated'
        WHEN 'POINTS_AWARDED' THEN '⭐ Points Earned'
        WHEN 'JOB_APPLY'      THEN '💼 Applied to Job'
        WHEN 'STATUS_UPDATE'  THEN '✅ Application Status Changed'
        ELSE '📝 Profile Updated'
    END AS activity_label,
    old_value,
    new_value,
    table_name
FROM AuditLog
WHERE record_id = 1  -- Replace with actual student_id
ORDER BY timestamp DESC
LIMIT 20;


-- ============================================================
-- QUERY 11: DEPARTMENT-WISE ANALYTICS SUMMARY
-- Overview statistics per department (for admin dashboard)
-- Demonstrates: GROUP BY, multiple aggregates, ROUND
-- ============================================================
SELECT
    s.department,
    COUNT(DISTINCT s.student_id)         AS total_students,
    ROUND(AVG(s.cgpa), 2)               AS avg_cgpa,
    MAX(s.cgpa)                         AS highest_cgpa,
    ROUND(AVG(s.total_points), 1)       AS avg_points,
    COUNT(DISTINCT a.application_id)     AS total_applications,
    COUNT(DISTINCT CASE WHEN a.status = 'Selected' THEN a.application_id END) AS placements,
    ROUND(
        COUNT(DISTINCT CASE WHEN a.status = 'Selected' THEN a.application_id END) * 100.0
        / NULLIF(COUNT(DISTINCT s.student_id), 0)
    , 1) AS placement_rate_pct
FROM Students s
LEFT JOIN Applications a ON s.student_id = a.student_id
GROUP BY s.department
ORDER BY placement_rate_pct DESC;