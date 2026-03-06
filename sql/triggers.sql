DELIMITER $$

CREATE TRIGGER update_progress
AFTER INSERT ON Student_Skills
FOR EACH ROW
BEGIN
UPDATE Students
SET updated_at = NOW()
WHERE student_id = NEW.student_id;
END$$

DELIMITER ;