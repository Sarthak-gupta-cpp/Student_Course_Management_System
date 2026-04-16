-- ============================================================
-- University Course Registration & Management System
-- MySQL Schema (3NF Normalized)
-- ============================================================

-- ============================================================
-- 1. Users Table
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS courses (
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
CREATE TABLE IF NOT EXISTS semesters (
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
CREATE TABLE IF NOT EXISTS course_offerings (
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
CREATE TABLE IF NOT EXISTS time_slots (
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
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id   INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL,
    offering_id     INT NOT NULL,
    status          ENUM('ENROLLED','WITHDRAWN') NOT NULL DEFAULT 'ENROLLED',
    grade           VARCHAR(5) DEFAULT NULL,           -- e.g., 'A', 'B+', 'NC'
    proposed_grade  VARCHAR(5) DEFAULT NULL,           -- changed grade requested by teacher after release
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
CREATE TABLE IF NOT EXISTS system_settings (
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
INSERT IGNORE INTO system_settings (id) VALUES (1);

-- Seed a master admin (update google_id and email after first Google sign-in)
INSERT IGNORE INTO users (email, name, role, google_id) VALUES ('sarthakgupta1303@gmail.com', 'Sarthak Gupta', 'ADMIN', '116034739564723755158');

-- ============================================================
-- Views
-- ============================================================
CREATE OR REPLACE VIEW student_dashboard_view AS 
SELECT 
    e.student_id,
    e.status AS enrollment_status,
    e.grade,
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

CREATE OR REPLACE VIEW teacher_dashboard_view AS
SELECT 
    t.id AS teacher_id,
    c.course_id,
    c.course_name,
    c.credits,
    c.department,
    s.name AS semester_name,
    co.max_capacity,
    co.current_enrolled
FROM course_offerings co
JOIN courses c ON co.course_id = c.course_id
JOIN semesters s ON co.semester_id = s.semester_id
JOIN users t ON co.teacher_id = t.id;
