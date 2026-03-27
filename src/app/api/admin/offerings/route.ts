import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export async function GET() {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const query = `
      SELECT 
        co.offering_id, co.course_id, co.semester_id, co.teacher_id, co.max_capacity, co.current_enrolled,
        c.course_name, s.name as semester_name, u.name as teacher_name,
        (
          SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ts.slot_id, 'day', ts.day_of_week, 'start', ts.start_time, 'end', ts.end_time))
          FROM time_slots ts
          WHERE ts.offering_id = co.offering_id
        ) as time_slots
      FROM course_offerings co
      JOIN courses c ON co.course_id = c.course_id
      JOIN semesters s ON co.semester_id = s.semester_id
      JOIN users u ON co.teacher_id = u.id
      ORDER BY s.is_current DESC, co.offering_id DESC;
    `;

    const [offerings] = await pool.query<RowDataPacket[]>(query);

    return NextResponse.json({ offerings });
  } catch (error) {
    console.error("Fetch offerings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { course_id, semester_id, teacher_id, max_capacity, time_slots } = await req.json();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insert Offering
    const [result] = await connection.query<ResultSetHeader>(
      "INSERT INTO course_offerings (course_id, semester_id, teacher_id, max_capacity) VALUES (?, ?, ?, ?)",
      [course_id, semester_id, teacher_id, max_capacity]
    );

    const offeringId = result.insertId;

    // 2. Insert Time Slots
    if (time_slots && Array.isArray(time_slots) && time_slots.length > 0) {
      for (const slot of time_slots) {
        await connection.query(
          "INSERT INTO time_slots (offering_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)",
          [offeringId, slot.day, slot.start, slot.end]
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Course offering created successfully" });
  } catch (error: any) {
    await connection.rollback();
    console.error("Create offering error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "This exact offering (course + semester + teacher) already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    connection.release();
  }
}
