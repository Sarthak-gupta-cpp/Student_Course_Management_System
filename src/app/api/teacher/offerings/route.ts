import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const session = await auth();
  
  if (!session || !session.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teacherId = session.user.id;

  try {
    const query = `
      SELECT 
        co.offering_id, co.max_capacity, co.current_enrolled,
        c.course_id, c.course_name, c.credits, c.department,
        s.name as semester_name, s.is_current,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('day', ts.day_of_week, 'start', ts.start_time, 'end', ts.end_time))
          FROM time_slots ts
          WHERE ts.offering_id = co.offering_id
        ) as schedule
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.course_id
      JOIN semesters s ON co.semester_id = s.semester_id
      WHERE co.teacher_id = ? 
      ORDER BY s.is_current DESC, c.course_id ASC;
    `;

    const [offerings] = await pool.query<RowDataPacket[]>(query, [teacherId]);

    return NextResponse.json({ offerings });

  } catch (error) {
    console.error("Fetch teacher offerings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
