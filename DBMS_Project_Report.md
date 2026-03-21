# SkillSync: Student Career Management System
**Database Management Systems (DBMS) - Comprehensive Project Report**

## 1. Project Overview
SkillSync is an advanced Career Management platform designed to bridge the gap between students and the industry. It empowers students with data-driven career analytics, peer benchmarking, and personalized job recommendations. For companies, it acts as an intelligent applicant tracking system (ATS). The core of SkillSync is heavily reliant on a carefully structured Relational Database Management System (RDBMS) using **SQLite 3**.

### 1.1 Tech Stack
*   **Frontend**: HTML5, CSS3 (Vanilla Native CSS), JavaScript (Vanilla), Chart.js (Data Visualization)
*   **Backend**: Node.js, Express.js
*   **Database**: SQLite 3 (Chosen for lightweight, serverless relational data management with full ACID compliance)

---

## 2. Relational Database Schema Design
The SkillSync database consists of **10 primary normalized tables**, crafted to maintain referential integrity while handling complex multi-entity relationships efficiently.

### 2.1 Core Entities & Relationships

| Table Name | Primary Key | Description & Key Relationships |
| :--- | :--- | :--- |
| **`Students`** | `student_id` | Core user entity (handles Auth & Profiles). |
| **`Skills`** | `skill_id` | Master list of all recognized industry skills. |
| **`StudentSkills`** | `(student_id, skill_id)` | Junction table (Many-to-Many). Links Students to Skills with proficiency levels. |
| **`Companies`** | `company_id` | Corporate entities posting jobs. |
| **`JobRoles`** | `role_id` | Postings by Companies. *Foreign Key: `company_id`*. |
| **`JobRoleSkills`** | `(role_id, skill_id)` | Junction table (Many-to-Many). Skills required for a specific job. |
| **`Applications`** | `application_id` | Links Students to JobRoles. *Foreign Keys: `student_id`, `role_id`*. |
| **`Projects` & `Certificates`**| `project_id`, `cert_id` | One-to-Many from `Students`. Tracks academic/extracurricular proof. |
| **`StudentPoints`** | `point_id` | Append-only event log tracking student activities for gamification. |
| **`CGPAHistory`** | `history_id` | Temporal table tracking changes to student CGPAs over time. |

### 2.2 Referential Integrity & Constraints
*   **`ON DELETE CASCADE`**: Strictly enforced across junction tables (`StudentSkills`, `Applications`) to prevent orphaned records when a primary entity (like a Student or Job) is removed.
*   **`UNIQUE` Constraints**: Applied to `(student_id, role_id)` in `Applications` to prevent duplicate job submissions, and to `email` in `Students` for Auth.
*   **`CHECK` Constraints**: Applied to the `role` column in `Students` (`CHECK(role IN ('student', 'mentor', 'company', 'admin'))`) to ensure domain integrity.

---

## 3. Advanced DBMS Features Implemented

The project goes beyond standard CRUD operations, leveraging advanced SQL capabilities to power the analytics engine.

### 3.1 Common Table Expressions (CTEs) & Recursive Queries
CTEs are used heavily to break down complex queries. A **Recursive CTE** is used to parse comma-separated skillstrings stored natively in legacy job postings into normalized relational formats on the fly for text-mining.

### 3.2 Window Functions (`OVER`, `PARTITION BY`, `RANK`)
Used extensively for comparative analytics without needing multiple self-joins.
*   **`PERCENT_RANK()`**: Calculates a student's exact percentile standing compared to peers in their specific department.
*   **`RANK()`**: Used to generate Leaderboards and prioritize Skill Recommendations based on multi-dimensional sorting (demand + importance).
*   **`SUM() OVER (ORDER BY ...)`**: Calculates running point totals for the student activity timeline.

### 3.3 Advanced Aggregations & Conditional Counting
*   **`COUNT(DISTINCT ...)`**: Used to calculate exact match percentages between required Job Skills and possessed Student Skills.
*   **`AVG(CASE WHEN ... THEN 1.0 ELSE 0 END)`**: Used to dynamically calculate application acceptance/success rates on the fly.

---

## 4. Key SQL Query Analysis

Below are the exact SQL queries driving the core computational features of the backend.

### 4.1 Skill Gap Analysis & Recommendation Engine (CTE + Window Function)
**Purpose**: Identifies missing skills a student needs for a target role, and ranks them by overall market demand across *all* jobs.

```sql
WITH role_skills AS (
    SELECT skill_id FROM JobRoleSkills WHERE role_id = ?
),
student_skills AS (
    SELECT skill_id FROM StudentSkills WHERE student_id = ?
),
missing_skills AS (
    SELECT rs.skill_id
    FROM role_skills rs
    WHERE rs.skill_id NOT IN (SELECT skill_id FROM student_skills)
),
skill_demand AS (
    SELECT
        sk.skill_id, sk.skill_name, sk.category,
        COUNT(DISTINCT jrs.role_id)      AS job_demand,
        COUNT(DISTINCT ss2.student_id)   AS students_with_skill
    FROM missing_skills ms
    JOIN Skills sk ON sk.skill_id = ms.skill_id
    LEFT JOIN JobRoleSkills jrs ON jrs.skill_id = sk.skill_id
    LEFT JOIN StudentSkills ss2 ON ss2.skill_id = sk.skill_id
    GROUP BY sk.skill_id
)
SELECT skill_name, category, job_demand, students_with_skill,
       RANK() OVER (ORDER BY job_demand DESC) AS priority_rank
FROM skill_demand
ORDER BY priority_rank
LIMIT 10;
```
*DBMS Concept: Uses chained CTEs for readability, a `NOT IN` subquery for set difference (Missing Skills), `LEFT JOIN`s for market aggregation, and a Window Function (`RANK`) for sorting.*

### 4.2 Peer Benchmarking & Percentile Calculation
**Purpose**: Tells a student exactly where they stand compared to others in their specific engineering branch.

```sql
SELECT student_id, name, cgpa, department,
       ROUND(PERCENT_RANK() OVER (PARTITION BY department ORDER BY cgpa) * 100, 1) as percentile
FROM Students;
```
*DBMS Concept: Utilizes the `PERCENT_RANK()` window function, grouped logically by the `PARTITION BY department` clause. This allows the DB to calculate relative ranks in a single pass without subqueries.*

### 4.3 Intelligent Job Match Scoring
**Purpose**: Calculates a percentage score denoting how well a student's profile matches a job's requirements.

```sql
SELECT
    COUNT(DISTINCT jrs.skill_id)  AS total_required,
    COUNT(DISTINCT ss.skill_id)   AS matched,
    ROUND(
        COUNT(DISTINCT ss.skill_id) * 100.0 /
        NULLIF(COUNT(DISTINCT jrs.skill_id), 0)
    , 1) AS skill_match_pct
FROM JobRoleSkills jrs
LEFT JOIN StudentSkills ss
    ON jrs.skill_id = ss.skill_id AND ss.student_id = ?
WHERE jrs.role_id = ?
```
*DBMS Concept: Relies on `COUNT(DISTINCT)` applied to the `JobRoleSkills` vs `StudentSkills` junction tables. `NULLIF` is used as a safety mechanism to prevent Divide-By-Zero errors on the database layer.*

### 4.4 Real-time Hiring Trends
**Purpose**: Generates analytics for the admin/company dashboard, showing which companies are hiring and their exact selection rates.

```sql
SELECT
    c.company_name,
    COUNT(a.application_id)    AS total_applications,
    ROUND(AVG(s.cgpa), 2)      AS avg_applicant_cgpa,
    ROUND(
        AVG(CASE WHEN a.status='Selected' THEN 1.0 ELSE 0 END) * 100, 1
    )                          AS selection_rate,
    COUNT(DISTINCT CASE WHEN a.status='Selected' THEN a.student_id END) AS placements
FROM Companies c
LEFT JOIN JobRoles jr  ON c.company_id = jr.company_id
LEFT JOIN Applications a ON jr.role_id = a.role_id
LEFT JOIN Students s   ON a.student_id = s.student_id
GROUP BY c.company_id
ORDER BY placements DESC, total_applications DESC
LIMIT 10;
```
*DBMS Concept: A complex 4-table `LEFT JOIN` aggregated by company. Uses `CASE WHEN` inside the `AVG` function to dynamically calculate boolean rates (Selection Rate) purely within SQL.*

---

## 5. Security & Data Integrity Measures
1.  **Prepared Statements**: ALL database queries utilize parameterized queries (e.g., `WHERE student_id = ?`) to completely mitigate **SQL Injection (SQLi)** attacks.
2.  **Transactions**: While SQLite applies implicit transactions, critical data workflows involving multiple tables utilize database-level checks to prevent partial writes.
3.  **Password Hashing**: User passwords are encrypted using `bcrypt` before being stored in the `password_hash` column of the `Students` table.

---

## 6. Project Architecture & File Structure

An overview of the essential files and directories that compose the application, demonstrating the separation of concerns across the stack:

### 6.1 Backend (`/backend/`)
*   **`server.js`**: The main entry point for the Node.js backend. Configures CORS, middleware, connects to the database, and mounts all Express API routes.
*   **`config/db.js`**: Contains the SQLite database connection logic and encapsulates asynchronous helper functions (`query`, `get`, `run`) for executing SQL statements safely.
*   **`controllers/`**:
    *   **`analyticsController.js`**: Houses the complex, compute-heavy SQL queries (like CTEs, Window Functions, and `GROUP BY` rollups) for generating dashboard insights, skill gaps, and peer rank calculations.
    *   **`studentController.js`**: Manages basic student CRUD operations, auth profiles, and file uploads.
    *   **`applicationController.js`**, **`companyController.js`**: Manage logic for fetching and updating job applications and company dashboard data.
*   **`routes/`**: Associates specific HTTP requests and endpoint paths (e.g., `GET /api/analytics`) to the corresponding controller functions.
*   **`uploads/`**: Serves as the localized storage directory for user uploads, including profile avatars and resumes.

### 6.2 Frontend (`/frontend/`)
*   **`public/`** (Static Documents & Markup):
    *   **`index.html`** / **`landing.html`**: The public-facing entry points that introduce the SkillSync platform to new users.
    *   **`dashboard.html`**: The primary dashboard view showing top-level matched careers, upcoming applications, and quick stats.
    *   **`analytics.html`**: The dedicated analytics module focusing deeply on Hiring Trends, Placement Probabilities, and Skill Recommendations.
    *   **`profile.html`**: The extensive student profile editor, integrated directly with LocalStorage so users can configure their settings offline before syncing to the database.
    *   **`css/index.css`** & **`css/dashboard.css`**: Contain modular, raw CSS stylesheets enforcing modern glassmorphism UI design, CSS variables, and dark-mode themes.
*   **`src/`** (Client-side JavaScript):
    *   **`dashboard.js`**: Asynchronously fetches JSON payloads from the backend APIs concurrently via `Promise.all()`. Dynamically paints the Chart.js visualizers and handles **Offline Fallbacks** directly from the browser's cache if the Node API drops.
    *   **`toast.js`**: Implements standardized notification snackbars and error handling alerts globally across the view layer.

### 6.3 Database & Utilities (`/sql/`)
*   **`schema.sql`**: The single source of truth for the entire SQLite architecture. Defines all `CREATE TABLE` operations, `FOREIGN KEY` cascades, and data types to construct an empty database environment from scratch.
*   **`seed.sql`** & **`analytics.sql`**: Supply mocked dummy data to instantiate realistic test cases, user profiles, and job applications for immediate presentation.

---

## 7. Conclusion
The SkillSync platform successfully implements a robust Relational Database Architecture. By offloading heavy computational logic (like ranking, matching, and aggregation) directly to the SQL layer via Advanced Queries rather than processing it in the application layer (Node.js), the system achieves high performance, data consistency, and an elegant structural design.
