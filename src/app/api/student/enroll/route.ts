import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export async function POST(req: Request) {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { offeringId } = await req.json();

  if (!offeringId) {
    return NextResponse.json({ error: "offeringId is required" }, { status: 400 });
  }

  const studentId = session.user.id;
  const connection = await pool.getConnection();

  try {
    // 1. Check System Settings for Registration Window
    const [settingsRows] = await connection.query<RowDataPacket[]>(
      "SELECT registration_start, registration_end FROM system_settings WHERE id = 1"
    );
    
    if (settingsRows.length === 0) {
      return NextResponse.json({ error: "System settings not configured" }, { status: 500 });
    }

    const { registration_start, registration_end } = settingsRows[0];
    const now = new Date();

    if (!registration_start || !registration_end || now < new Date(registration_start) || now > new Date(registration_end)) {
      return NextResponse.json({ error: "Registration is currently closed" }, { status: 403 });
    }

    // Begin Transaction
    await connection.beginTransaction();

    // 2. Lock the offering row to check capacity (Concurrency Control)
    const [offeringRows] = await connection.query<RowDataPacket[]>(
      "SELECT max_capacity, current_enrolled, semester_id FROM course_offerings WHERE offering_id = ? FOR UPDATE",
      [offeringId]
    );

    if (offeringRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Course offering not found" }, { status: 404 });
    }

    const { max_capacity, current_enrolled, semester_id } = offeringRows[0];

    if (current_enrolled >= max_capacity) {
      await connection.rollback();
      return NextResponse.json({ error: "Course is full" }, { status: 409 });
    }

    // 3. Check if already enrolled or withdrawn (can re-enroll if withdrawn)
    const [existingEnrollment] = await connection.query<RowDataPacket[]>(
      "SELECT enrollment_id, status FROM enrollments WHERE student_id = ? AND offering_id = ?",
      [studentId, offeringId]
    );

    if (existingEnrollment.length > 0 && existingEnrollment[0].status === 'ENROLLED') {
      await connection.rollback();
      return NextResponse.json({ error: "Already enrolled in this course" }, { status: 409 });
    }

    // 4. Clash Detection Engine
    // Check if any of the student's CURRENTLY ENROLLED time slots overlap with the REQUESTED offering's time slots
    const clashQuery = `
      SELECT 
        ts1.day_of_week, ts1.slot_number as req_slot, ts1.duration as req_dur,
        ts2.slot_number as curr_slot, ts2.duration as curr_dur,
        c.course_name as clashing_course
      FROM time_slots ts1
      JOIN time_slots ts2 ON ts1.day_of_week = ts2.day_of_week
      JOIN enrollments e ON ts2.offering_id = e.offering_id
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      WHERE 
        ts1.offering_id = ? 
        AND e.student_id = ?
        AND e.status = 'ENROLLED'
        AND co.semester_id = ?  -- Only check clashes within the same semester
        AND (
          (ts1.slot_number < ts2.slot_number + ts2.duration AND ts2.slot_number < ts1.slot_number + ts1.duration)
        )
      LIMIT 1;
    `;

    const [clashRows] = await connection.query<RowDataPacket[]>(clashQuery, [offeringId, studentId, semester_id]);

    if (clashRows.length > 0) {
      await connection.rollback();
      const clash = clashRows[0];
      return NextResponse.json({ 
        error: `Time clash detected with ${clash.clashing_course} on ${clash.day_of_week}`,
        clashDetails: clash
      }, { status: 409 });
    }

    // 5. Execute Enrollment
    if (existingEnrollment.length > 0 && existingEnrollment[0].status === 'WITHDRAWN') {
      // Update existing withdrawn record
      await connection.query(
        "UPDATE enrollments SET status = 'ENROLLED', updated_at = NOW() WHERE enrollment_id = ?",
        [existingEnrollment[0].enrollment_id]
      );
    } else {
      // Insert new enrollment record
      await connection.query(
        "INSERT INTO enrollments (student_id, offering_id, status) VALUES (?, ?, 'ENROLLED')",
        [studentId, offeringId]
      );
    }

    // 6. Manual update removed: current_enrolled capacity is now synchronously maintained by the trg_after_enrollment_insert & update triggers natively in the database.

    // Commit Transaction
    await connection.commit();
    return NextResponse.json({ success: true, message: "Enrolled successfully" });

  } catch (error) {
    await connection.rollback();
    console.error("Enrollment error:", error);
    return NextResponse.json({ error: "Internal server error during enrollment" }, { status: 500 });
  } finally {
    connection.release();
  }
}
