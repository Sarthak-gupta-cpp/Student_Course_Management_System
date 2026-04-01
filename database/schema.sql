-- ============================================================
-- University Course Registration & Management System
-- MySQL Schema (3NF Normalized)
-- ============================================================

CREATE DATABASE IF NOT EXISTS course_management;
USE course_management;

-- ============================================================
-- 1. Users Table
-- ============================================================
CREATE TABLE users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    role            ENUM('STUDENT', 'TEACHER', 'ADMIN', 'PENDING_ADMIN') NOT NULL DEFAULT 'STUDENT',
    google_id       VARCHAR(255) NOT NULL UNIQUE,
    image           VARCHAR(512) DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Courses Table
-- ============================================================
CREATE TABLE courses (
    course_id       VARCHAR(20) PRIMARY KEY,          -- e.g., 'CS F211'
    course_name     VARCHAR(255) NOT NULL,
    credits         INT NOT NULL CHECK (credits > 0 AND credits <= 10),
    department      VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_courses_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Semesters Table
-- ============================================================
CREATE TABLE semesters (
    semester_id     INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,     -- e.g., '2025 Spring'
    is_current      BOOLEAN NOT NULL DEFAULT FALSE,
    start_date      DATE DEFAULT NULL,
    end_date        DATE DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_semesters_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Course Offerings Table
--    Links a course to a semester and a teacher
-- ============================================================
CREATE TABLE course_offerings (
    offering_id     INT AUTO_INCREMENT PRIMARY KEY,
    course_id       VARCHAR(20) NOT NULL,
    semester_id     INT NOT NULL,
    teacher_id      INT NOT NULL,
    max_capacity    INT NOT NULL DEFAULT 60 CHECK (max_capacity > 0),
    current_enrolled INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (course_id)   REFERENCES courses(course_id)   ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(semester_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (teacher_id)  REFERENCES users(id)             ON DELETE CASCADE ON UPDATE CASCADE,

    UNIQUE KEY uk_offering (course_id, semester_id, teacher_id),
    INDEX idx_offerings_semester (semester_id),
    INDEX idx_offerings_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Time Slots Table
--    Schedule entries for each course offering
-- ============================================================
CREATE TABLE time_slots (
    slot_id         INT AUTO_INCREMENT PRIMARY KEY,
    offering_id     INT NOT NULL,
    day_of_week     ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
    slot_number     INT NOT NULL,
    duration        INT NOT NULL DEFAULT 1 CHECK (duration IN (1, 2, 3)),
    slot_type       ENUM('LECTURE', 'TUTORIAL', 'PRACTICAL') NOT NULL DEFAULT 'LECTURE',

    FOREIGN KEY (offering_id) REFERENCES course_offerings(offering_id) ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_slots_offering (offering_id),
    INDEX idx_slots_day (day_of_week),
    CONSTRAINT chk_valid_slot CHECK (slot_number >= 1 AND slot_number <= 12 AND slot_number + duration - 1 <= 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Enrollments Table
--    Maps students to course offerings with grading
-- ============================================================
CREATE TABLE enrollments (
    enrollment_id   INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    offering_id     INT NOT NULL,
    status          ENUM('ENROLLED','WITHDRAWN') NOT NULL DEFAULT 'ENROLLED',
    grade           VARCHAR(5) DEFAULT NULL,           -- e.g., 'A', 'B+', 'NC'
    is_grade_released BOOLEAN NOT NULL DEFAULT FALSE,
    grade_submitted_to_admin BOOLEAN NOT NULL DEFAULT FALSE,
    enrolled_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)  REFERENCES users(id)                      ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (offering_id) REFERENCES course_offerings(offering_id)  ON DELETE CASCADE ON UPDATE CASCADE,

    UNIQUE KEY uk_enrollment (student_id, offering_id),
    INDEX idx_enrollments_student (student_id),
    INDEX idx_enrollments_offering (offering_id),
    INDEX idx_enrollments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. System Settings Table
--    Global registration/drop window configuration
-- ============================================================
CREATE TABLE system_settings (
    id                  INT PRIMARY KEY DEFAULT 1,
    registration_start  DATETIME DEFAULT NULL,
    registration_end    DATETIME DEFAULT NULL,
    drop_start          DATETIME DEFAULT NULL,
    drop_end            DATETIME DEFAULT NULL,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed Data
-- ============================================================

-- Insert default system settings row
INSERT INTO system_settings (id) VALUES (1);

-- Seed a master admin (update google_id and email after first Google sign-in)
INSERT INTO users (email, name, role, google_id) VALUES
('f20240478@goa.bits-pilani.ac.in', 'System Admin', 'ADMIN', 'SEED_ADMIN_GOOGLE_ID');


-- ============================================================
-- University Course Registration & Management System
-- MySQL Schema (3NF Normalized)
-- ============================================================

CREATE DATABASE IF NOT EXISTS course_management;
USE course_management;

-- ============================================================
-- 1. Users Table
-- ============================================================
CREATE TABLE users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    role            ENUM('STUDENT', 'TEACHER', 'ADMIN', 'PENDING_ADMIN') NOT NULL DEFAULT 'STUDENT',
    google_id       VARCHAR(255) NOT NULL UNIQUE,
    image           VARCHAR(512) DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. Courses Table
-- ============================================================
CREATE TABLE courses (
    course_id       VARCHAR(20) PRIMARY KEY,          -- e.g., 'CS F211'
    course_name     VARCHAR(255) NOT NULL,
    credits         INT NOT NULL CHECK (credits > 0 AND credits <= 10),
    department      VARCHAR(100) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_courses_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Semesters Table
-- ============================================================
CREATE TABLE semesters (
    semester_id     INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,     -- e.g., '2025 Spring'
    is_current      BOOLEAN NOT NULL DEFAULT FALSE,
    start_date      DATE DEFAULT NULL,
    end_date        DATE DEFAULT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_semesters_current (is_current)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Course Offerings Table
--    Links a course to a semester and a teacher
-- ============================================================
CREATE TABLE course_offerings (
    offering_id     INT AUTO_INCREMENT PRIMARY KEY,
    course_id       VARCHAR(20) NOT NULL,
    semester_id     INT NOT NULL,
    teacher_id      INT NOT NULL,
    max_capacity    INT NOT NULL DEFAULT 60 CHECK (max_capacity > 0),
    current_enrolled INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (course_id)   REFERENCES courses(course_id)   ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(semester_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (teacher_id)  REFERENCES users(id)             ON DELETE CASCADE ON UPDATE CASCADE,

    UNIQUE KEY uk_offering (course_id, semester_id, teacher_id),
    INDEX idx_offerings_semester (semester_id),
    INDEX idx_offerings_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Time Slots Table
--    Schedule entries for each course offering
-- ============================================================
CREATE TABLE time_slots (
    slot_id         INT AUTO_INCREMENT PRIMARY KEY,
    offering_id     INT NOT NULL,
    day_of_week     ENUM('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') NOT NULL,
    slot_number     INT NOT NULL,
    duration        INT NOT NULL DEFAULT 1 CHECK (duration IN (1, 2, 3)),
    slot_type       ENUM('LECTURE', 'TUTORIAL', 'PRACTICAL') NOT NULL DEFAULT 'LECTURE',

    FOREIGN KEY (offering_id) REFERENCES course_offerings(offering_id) ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_slots_offering (offering_id),
    INDEX idx_slots_day (day_of_week),
    CONSTRAINT chk_valid_slot CHECK (slot_number >= 1 AND slot_number <= 12 AND slot_number + duration - 1 <= 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Enrollments Table
--    Maps students to course offerings with grading
-- ============================================================
CREATE TABLE enrollments (
    enrollment_id   INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    offering_id     INT NOT NULL,
    status          ENUM('ENROLLED','WITHDRAWN') NOT NULL DEFAULT 'ENROLLED',
    grade           VARCHAR(5) DEFAULT NULL,           -- e.g., 'A', 'B+', 'NC'
    is_grade_released BOOLEAN NOT NULL DEFAULT FALSE,
    grade_submitted_to_admin BOOLEAN NOT NULL DEFAULT FALSE,
    enrolled_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)  REFERENCES users(id)                      ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (offering_id) REFERENCES course_offerings(offering_id)  ON DELETE CASCADE ON UPDATE CASCADE,

    UNIQUE KEY uk_enrollment (student_id, offering_id),
    INDEX idx_enrollments_student (student_id),
    INDEX idx_enrollments_offering (offering_id),
    INDEX idx_enrollments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. System Settings Table
--    Global registration/drop window configuration
-- ============================================================
CREATE TABLE system_settings (
    id                  INT PRIMARY KEY DEFAULT 1,
    registration_start  DATETIME DEFAULT NULL,
    registration_end    DATETIME DEFAULT NULL,
    drop_start          DATETIME DEFAULT NULL,
    drop_end            DATETIME DEFAULT NULL,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_single_row CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed Data
-- ============================================================

-- Insert default system settings row
INSERT INTO system_settings (id) VALUES (1);

-- Seed a master admin (update google_id and email after first Google sign-in)
INSERT INTO users (email, name, role, google_id) VALUES
('f20240478@goa.bits-pilani.ac.in', 'System Admin', 'ADMIN', 'SEED_ADMIN_GOOGLE_ID');

CREATE VIEW view_student_courses AS
SELECT 
    u.id AS student_id,
    u.name AS student_name,
    c.course_id,
    c.course_name,
    s.name AS semester,
    e.status,
    e.grade,
    co.offering_id
FROM enrollments e
JOIN users u ON e.student_id = u.id
JOIN course_offerings co ON e.offering_id = co.offering_id
JOIN courses c ON co.course_id = c.course_id
JOIN semesters s ON co.semester_id = s.semester_id;

CREATE VIEW view_course_enrollment_summary AS
SELECT 
    co.offering_id,
    c.course_id,
    c.course_name,
    s.name AS semester,
    co.max_capacity,
    co.current_enrolled,
    (co.max_capacity - co.current_enrolled) AS seats_left
FROM course_offerings co
JOIN courses c ON co.course_id = c.course_id
JOIN semesters s ON co.semester_id = s.semester_id;

CREATE VIEW view_teacher_load AS
SELECT 
    u.id AS teacher_id,
    u.name AS teacher_name,
    COUNT(co.offering_id) AS courses_teaching
FROM users u
LEFT JOIN course_offerings co ON u.id = co.teacher_id
WHERE u.role = 'TEACHER'
GROUP BY u.id;

CREATE VIEW view_timetable AS
SELECT 
    co.offering_id,
    c.course_name,
    ts.day_of_week,
    ts.slot_number,
    ts.duration,
    ts.slot_type
FROM time_slots ts
JOIN course_offerings co ON ts.offering_id = co.offering_id
JOIN courses c ON co.course_id = c.course_id;

DELIMITER $$

CREATE FUNCTION seats_available(p_offering_id INT)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE seats INT;

    SELECT (max_capacity - current_enrolled)
    INTO seats
    FROM course_offerings
    WHERE offering_id = p_offering_id;

    RETURN seats;
END$$

DELIMITER ;

DELIMITER $$

CREATE FUNCTION is_registration_open()
RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    DECLARE result BOOLEAN;

    SELECT 
        (NOW() BETWEEN registration_start AND registration_end)
    INTO result
    FROM system_settings
    WHERE id = 1;

    RETURN result;
END$$

DELIMITER ;

DELIMITER $$

CREATE FUNCTION student_total_credits(p_student_id INT)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE total INT;

    SELECT SUM(c.credits)
    INTO total
    FROM enrollments e
    JOIN course_offerings co ON e.offering_id = co.offering_id
    JOIN courses c ON co.course_id = c.course_id
    WHERE e.student_id = p_student_id
      AND e.status = 'ENROLLED';

    RETURN IFNULL(total, 0);
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_check_capacity
BEFORE INSERT ON enrollments
FOR EACH ROW
BEGIN
    DECLARE seats INT;

    SELECT (max_capacity - current_enrolled)
    INTO seats
    FROM course_offerings
    WHERE offering_id = NEW.offering_id;

    IF seats <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Course capacity exceeded';
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_increment_enrollment
AFTER INSERT ON enrollments
FOR EACH ROW
BEGIN
    UPDATE course_offerings
    SET current_enrolled = current_enrolled + 1
    WHERE offering_id = NEW.offering_id;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_decrement_enrollment
AFTER UPDATE ON enrollments
FOR EACH ROW
BEGIN
    IF OLD.status = 'ENROLLED' AND NEW.status = 'WITHDRAWN' THEN
        UPDATE course_offerings
        SET current_enrolled = current_enrolled - 1
        WHERE offering_id = NEW.offering_id;
    END IF;
END$$

DELIMITER ;

DELIMITER $$

CREATE TRIGGER trg_registration_window
BEFORE INSERT ON enrollments
FOR EACH ROW
BEGIN
    DECLARE is_open BOOLEAN;

    SELECT (NOW() BETWEEN registration_start AND registration_end)
    INTO is_open
    FROM system_settings
    WHERE id = 1;

    IF NOT is_open THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Registration window is closed';
    END IF;
END$$

DELIMITER ;

CREATE VIEW view_student_schedule_conflicts AS
SELECT 
    e1.student_id,
    ts1.day_of_week,
    ts1.slot_number,
    e1.offering_id AS offering_1,
    e2.offering_id AS offering_2
FROM enrollments e1
JOIN enrollments e2 
    ON e1.student_id = e2.student_id 
    AND e1.offering_id < e2.offering_id
JOIN time_slots ts1 ON ts1.offering_id = e1.offering_id
JOIN time_slots ts2 ON ts2.offering_id = e2.offering_id
WHERE ts1.day_of_week = ts2.day_of_week
AND ts1.slot_number = ts2.slot_number;