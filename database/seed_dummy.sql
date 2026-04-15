USE course_management;

-- 1. Get the admin/teacher ID for Sarthak dynamically
SELECT id INTO @t_id FROM users WHERE email = 'sarthakgupta1303@gmail.com' LIMIT 1;

-- 2. Add 3 Semesters
INSERT INTO semesters (name, is_current, start_date, end_date) VALUES 
('2025-26 Sem1', FALSE, '2024-08-01', '2024-12-15'),
('2025-26 Sem2', TRUE, '2025-01-15', '2025-05-30'),
('2026-27 Sem1', FALSE, '2025-08-01', '2025-12-15');

-- 3. Add 10 Courses
INSERT INTO courses (course_id, course_name, credits, department) VALUES 
('CS F111', 'Computer Programming', 4, 'Computer Science'),
('CS F211', 'Data Structures & Algorithms', 4, 'Computer Science'),
('CS F212', 'Database Systems', 4, 'Computer Science'),
('CS F213', 'Object Oriented Programming', 3, 'Computer Science'),
('MATH F111', 'Mathematics I', 3, 'Mathematics'),
('MATH F112', 'Mathematics II', 3, 'Mathematics'),
('PHY F111', 'Physics I', 3, 'Physics'),
('EE F111', 'Electrical Sciences', 4, 'Electrical'),
('BITS F110', 'Engineering Graphics', 3, 'Mechanical'),
('HSS F111', 'Technical Report Writing', 2, 'Humanities');

-- 4. Add 5 Offerings per Semester (15 total) all taught by Sarthak
-- Sem 1 Offerings (IDs: 1 to 5)
INSERT INTO course_offerings (course_id, semester_id, teacher_id) VALUES
('CS F111', 1, @t_id),
('CS F211', 1, @t_id),
('MATH F111', 1, @t_id),
('PHY F111', 1, @t_id),
('EE F111', 1, @t_id);

-- Sem 2 Offerings (IDs: 6 to 10)
INSERT INTO course_offerings (course_id, semester_id, teacher_id) VALUES
('CS F212', 2, @t_id),
('CS F213', 2, @t_id),
('MATH F112', 2, @t_id),
('BITS F110', 2, @t_id),
('HSS F111', 2, @t_id);

-- Sem 3 Offerings (IDs: 11 to 15)
INSERT INTO course_offerings (course_id, semester_id, teacher_id) VALUES
('CS F111', 3, @t_id),
('CS F211', 3, @t_id),
('CS F212', 3, @t_id),
('MATH F111', 3, @t_id),
('EE F111', 3, @t_id);

-- 5. Add Schedule Timings WITH CLASHES
-- A clash happens when two offerings IN THE SAME SEMESTER are on the same day and have overlapping slots.

-- === SEMESTER 1 TIMINGS ===
-- Offering 1 (CS F111)
INSERT INTO time_slots (offering_id, day_of_week, slot_number, duration, slot_type) VALUES
(1, 'MONDAY', 3, 2, 'LECTURE'),   -- Mon 3, 4
(1, 'WEDNESDAY', 3, 1, 'LECTURE'),
(1, 'FRIDAY', 5, 2, 'PRACTICAL');

-- Offering 2 (CS F211): Deliberate Clash on Monday Slot 4!
INSERT INTO time_slots (offering_id, day_of_week, slot_number, duration, slot_type) VALUES
(2, 'MONDAY', 4, 1, 'LECTURE'),   -- Mon 4 (CLASH with Offering 1)
(2, 'THURSDAY', 2, 2, 'LECTURE');

-- Offering 3, 4, 5 (No clash)
INSERT INTO time_slots (offering_id, day_of_week, slot_number, duration, slot_type) VALUES
(3, 'TUESDAY', 1, 1, 'LECTURE'), (3, 'THURSDAY', 1, 1, 'LECTURE'),
(4, 'TUESDAY', 2, 1, 'LECTURE'), (4, 'THURSDAY', 3, 1, 'LECTURE'),
(5, 'FRIDAY', 1, 3, 'PRACTICAL');


-- === SEMESTER 2 TIMINGS ===
-- Offering 6 (CS F212)
INSERT INTO time_slots (offering_id, day_of_week, slot_number, duration, slot_type) VALUES
(6, 'TUESDAY', 8, 2, 'LECTURE'),  -- Tue 8, 9
(6, 'THURSDAY', 8, 1, 'LECTURE'),
(6, 'MONDAY', 1, 2, 'PRACTICAL');

-- Offering 7 (CS F213): Deliberate Clash on Tuesday Slot 9!
INSERT INTO time_slots (offering_id, day_of_week, slot_number, duration, slot_type) VALUES
(7, 'TUESDAY', 9, 1, 'LECTURE'),  -- Tue 9 (CLASH with Offering 6)
(7, 'FRIDAY', 2, 2, 'LECTURE');

-- Offering 8, 9, 10
INSERT INTO time_slots (offering_id, day_of_week, slot_number, duration, slot_type) VALUES
(8, 'WEDNESDAY', 4, 1, 'LECTURE'),
(9, 'WEDNESDAY', 5, 1, 'LECTURE'),
(10, 'THURSDAY', 10, 2, 'PRACTICAL');


-- === SEMESTER 3 TIMINGS ===
-- Offering 11, 12, 13
INSERT INTO time_slots (offering_id, day_of_week, slot_number, duration, slot_type) VALUES
(11, 'MONDAY', 1, 1, 'LECTURE'),
(12, 'MONDAY', 2, 1, 'LECTURE'),
(13, 'MONDAY', 3, 1, 'LECTURE');

-- Offering 14 (MATH F111)
INSERT INTO time_slots (offering_id, day_of_week, slot_number, duration, slot_type) VALUES
(14, 'WEDNESDAY', 2, 2, 'PRACTICAL'), -- Wed 2, 3
(14, 'FRIDAY', 4, 1, 'LECTURE');

-- Offering 15 (EE F111): Deliberate Clash on Wednesday Slot 3
INSERT INTO time_slots (offering_id, day_of_week, slot_number, duration, slot_type) VALUES
(15, 'WEDNESDAY', 3, 1, 'LECTURE'),  -- Wed 3 (CLASH with Offering 14)
(15, 'FRIDAY', 5, 1, 'LECTURE');
