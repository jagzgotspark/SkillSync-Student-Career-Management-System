-- Most demanded skill
SELECT 
    s.skill_name,
    COUNT(cs.career_id) AS demand
FROM Skills s
JOIN Career_Skills cs ON s.skill_id = cs.skill_id
GROUP BY s.skill_name
ORDER BY demand DESC;


-- Average skill level per student
SELECT 
    student_id,
    AVG(skill_level) AS avg_skill
FROM Student_Skills
GROUP BY student_id;