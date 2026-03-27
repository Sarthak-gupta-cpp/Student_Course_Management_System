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
    const query = `
      SELECT 
        ts.day_of_week, ts.start_time, ts.end_time,
        c.course_id, c.course_name, c.department,
        u.name as teacher_name
      FROM enrollments e
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN time_slots ts ON co.offering_id = ts.offering_id
      JOIN users u ON co.teacher_id = u.id
      JOIN semesters s ON co.semester_id = s.semester_id
      WHERE e.student_id = ? AND e.status = 'ENROLLED' AND s.is_current = TRUE
      ORDER BY FIELD(ts.day_of_week, 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'), ts.start_time;
    `;

    const [schedule] = await pool.query<RowDataPacket[]>(query, [studentId]);

    // Group schedule by day
    const groupedSchedule = schedule.reduce((acc: any, curr: any) => {
      const day = curr.day_of_week;
      if (!acc[day]) acc[day] = [];
      acc[day].push(curr);
      return acc;
    }, {});

    return NextResponse.json({ schedule: groupedSchedule });

  } catch (error) {
    console.error("Fetch dashboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
