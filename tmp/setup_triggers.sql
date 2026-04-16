USE course_management;
DELIMITER //
DROP FUNCTION IF EXISTS fn_grade_point //
CREATE FUNCTION fn_grade_point(grade_val VARCHAR(5)) RETURNS INT
DETERMINISTIC
BEGIN
    RETURN CASE grade_val
        WHEN 'A' THEN 10 WHEN 'A-' THEN 9 WHEN 'B' THEN 8
        WHEN 'B-' THEN 7 WHEN 'C' THEN 6 WHEN 'C-' THEN 5
        WHEN 'D' THEN 4 WHEN 'E' THEN 2 WHEN 'NC' THEN 0
        ELSE 0 END;
END //

DROP TRIGGER IF EXISTS trg_after_enrollment_insert //
CREATE TRIGGER trg_after_enrollment_insert
AFTER INSERT ON enrollments
FOR EACH ROW
BEGIN
    IF NEW.status = 'ENROLLED' THEN
        UPDATE course_offerings 
        SET current_enrolled = current_enrolled + 1 
        WHERE offering_id = NEW.offering_id;
    END IF;
END //

DROP TRIGGER IF EXISTS trg_after_enrollment_update //
CREATE TRIGGER trg_after_enrollment_update
AFTER UPDATE ON enrollments
FOR EACH ROW
BEGIN
    IF OLD.status != 'ENROLLED' AND NEW.status = 'ENROLLED' THEN
        UPDATE course_offerings 
        SET current_enrolled = current_enrolled + 1 
        WHERE offering_id = NEW.offering_id;
    ELSEIF OLD.status = 'ENROLLED' AND NEW.status != 'ENROLLED' THEN
        UPDATE course_offerings 
        SET current_enrolled = GREATEST(0, current_enrolled - 1) 
        WHERE offering_id = NEW.offering_id;
    END IF;
END //

DROP TRIGGER IF EXISTS trg_after_enrollment_delete //
CREATE TRIGGER trg_after_enrollment_delete
AFTER DELETE ON enrollments
FOR EACH ROW
BEGIN
    IF OLD.status = 'ENROLLED' THEN
        UPDATE course_offerings 
        SET current_enrolled = GREATEST(0, current_enrolled - 1) 
        WHERE offering_id = OLD.offering_id;
    END IF;
END //

DELIMITER ;

CREATE OR REPLACE VIEW student_dashboard_view AS 
SELECT 
    e.student_id,
    e.status AS enrollment_status,
    e.grade,
    fn_grade_point(e.grade) AS grade_points,
    c.course_id,
    c.course_name,
    c.credits,
    c.department,
    s.name AS semester_name,
    t.name AS teacher_name
FROM enrollments e
JOIN course_offerings co ON e.offering_id = co.offering_id
JOIN courses c ON co.course_id = c.course_id
JOIN semesters s ON co.semester_id = s.semester_id
JOIN users t ON co.teacher_id = t.id;
