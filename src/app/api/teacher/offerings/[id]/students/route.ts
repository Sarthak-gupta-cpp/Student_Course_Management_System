import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  
  if (!session || !session.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: offeringId } = await params;
  const teacherId = session.user.id;

  try {
    // 1. Verify this offering belongs to this teacher (or user is ADMIN)
    if (session.user.role === "TEACHER") {
      const [verify] = await pool.query<RowDataPacket[]>(
        "SELECT 1 FROM course_offerings WHERE offering_id = ? AND teacher_id = ?",
        [offeringId, teacherId]
      );
      if (verify.length === 0) {
        return NextResponse.json({ error: "Forbidden - Not your course" }, { status: 403 });
      }
    }

    // 2. Fetch enrolled students
    const query = `
      SELECT 
        e.enrollment_id, e.status, e.grade, e.is_grade_released, e.grade_submitted_to_admin,
        u.id as student_id, u.name as student_name, u.email as student_email, u.image as student_image
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.offering_id = ? AND e.status = 'ENROLLED'
      ORDER BY u.name ASC;
    `;

    const [students] = await pool.query<RowDataPacket[]>(query, [offeringId]);

    return NextResponse.json({ students });

  } catch (error) {
    console.error("Fetch students error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "TEACHER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: offeringId } = await params;
  const teacherId = session.user.id;
  const body = await req.json();
  const { grades, action } = body; // grades: { enrollmentId: grade_string }, action: 'DRAFT' | 'SUBMIT'

  if (!grades || typeof grades !== 'object' || !['DRAFT', 'SUBMIT'].includes(action)) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const connection = await pool.getConnection();

  try {
    // 1. Verify offering ownership
    const [verify] = await connection.query<RowDataPacket[]>(
      "SELECT 1 FROM course_offerings WHERE offering_id = ? AND teacher_id = ?",
      [offeringId, teacherId]
    );

    if (verify.length === 0) {
      return NextResponse.json({ error: "Forbidden - Not your course" }, { status: 403 });
    }

    // 2. Process grades mapping
    await connection.beginTransaction();

    const isSubmitted = action === 'SUBMIT';

    // Verify no grades are already submitted and locked for this course
    const [locked] = await connection.query<RowDataPacket[]>(
      "SELECT 1 FROM enrollments WHERE offering_id = ? AND is_grade_released = TRUE LIMIT 1",
      [offeringId]
    );

    if (locked.length > 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Grades have already been released to students and cannot be modified" }, { status: 403 });
    }

    for (const [enrollmentId, grade] of Object.entries(grades)) {
      if (typeof grade === 'string' && grade.trim() !== '') {
        await connection.query(
          "UPDATE enrollments SET grade = ?, grade_submitted_to_admin = ? WHERE enrollment_id = ? AND offering_id = ?",
          [grade, isSubmitted, enrollmentId, offeringId]
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: action === 'SUBMIT' ? "Grades submitted to Admin" : "Draft saved successfully" });

  } catch (error) {
    await connection.rollback();
    console.error("Save grades error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    connection.release();
  }
}
