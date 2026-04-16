import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

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
    // 1. Check System Settings
    const [settingsRows] = await connection.query<RowDataPacket[]>(
      "SELECT drop_start, drop_end FROM system_settings WHERE id = 1"
    );
    
    if (settingsRows.length === 0) {
      return NextResponse.json({ error: "System settings not configured" }, { status: 500 });
    }

    const { drop_start, drop_end } = settingsRows[0];
    const now = new Date();

    if (!drop_start || !drop_end || now < new Date(drop_start) || now > new Date(drop_end)) {
      return NextResponse.json({ error: "Drop window is currently closed" }, { status: 403 });
    }

    await connection.beginTransaction();

    // 2. Check Enrollment Status
    const [existingEnrollment] = await connection.query<RowDataPacket[]>(
      "SELECT enrollment_id, status FROM enrollments WHERE student_id = ? AND offering_id = ? FOR UPDATE",
      [studentId, offeringId]
    );

    if (existingEnrollment.length === 0 || existingEnrollment[0].status !== 'ENROLLED') {
      await connection.rollback();
      return NextResponse.json({ error: "No active enrollment found for this course" }, { status: 404 });
    }

    // 3. Mark as Withdrawn (soft delete to keep history/grades)
    await connection.query(
      "UPDATE enrollments SET status = 'WITHDRAWN', updated_at = NOW() WHERE enrollment_id = ?",
      [existingEnrollment[0].enrollment_id]
    );

    // 4. Manual update removed: current_enrolled capacity is now synchronously maintained by the trg_after_enrollment_update natively in the database.

    await connection.commit();
    return NextResponse.json({ success: true, message: "Course dropped successfully" });

  } catch (error) {
    await connection.rollback();
    console.error("Drop error:", error);
    return NextResponse.json({ error: "Internal server error during drop action" }, { status: 500 });
  } finally {
    connection.release();
  }
}
