import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = session.user.id;

  try {
    // 1. Get current semester
    const [currentSemester] = await pool.query<RowDataPacket[]>(
      "SELECT semester_id, name FROM semesters WHERE is_current = TRUE LIMIT 1"
    );

    if (currentSemester.length === 0) {
      return NextResponse.json({ courses: [], systemSettings: null, semester: null });
    }

    const currentSemesterId = currentSemester[0].semester_id;
    
    // 2. Query available courses containing full info
    const query = `
      SELECT 
        co.offering_id, co.course_id, co.max_capacity, co.current_enrolled,
        c.course_name, c.credits, c.department,
        u.name as teacher_name,
        e.status as enrollment_status,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('day', ts.day_of_week, 'start', ts.start_time, 'end', ts.end_time))
          FROM time_slots ts
          WHERE ts.offering_id = co.offering_id
        ) as schedule
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.course_id
      JOIN users u ON co.teacher_id = u.id
      LEFT JOIN enrollments e ON co.offering_id = e.offering_id AND e.student_id = ?
      WHERE co.semester_id = ?
      ORDER BY c.department, c.course_id;
    `;

    const [courses] = await pool.query<RowDataPacket[]>(query, [studentId, currentSemesterId]);

    // 3. Get system settings
    const [settings] = await pool.query<RowDataPacket[]>(
      "SELECT registration_start, registration_end, drop_start, drop_end FROM system_settings WHERE id = 1"
    );

    return NextResponse.json({
      semester: currentSemester[0],
      courses,
      systemSettings: settings[0]
    });

  } catch (error) {
    console.error("Fetch courses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
