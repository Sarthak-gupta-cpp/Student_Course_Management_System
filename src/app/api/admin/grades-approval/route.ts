import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch pending grades (submitted by teachers, not yet released)
    const query = `
      SELECT 
        e.enrollment_id, e.grade, e.offering_id,
        u.name as student_name, u.email as student_email,
        c.course_name, c.course_id,
        t.name as teacher_name
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN users t ON co.teacher_id = t.id
      WHERE e.grade_submitted_to_admin = TRUE AND e.is_grade_released = FALSE
      ORDER BY co.offering_id ASC, u.name ASC;
    `;

    const [pendingGrades] = await pool.query<RowDataPacket[]>(query);

    // Group by course offering for easier UI consumption
    const groupedOfferings = pendingGrades.reduce((acc: any, curr: any) => {
      const offeringKey = curr.offering_id;
      if (!acc[offeringKey]) {
        acc[offeringKey] = {
          offering_id: offeringKey,
          course_id: curr.course_id,
          course_name: curr.course_name,
          teacher_name: curr.teacher_name,
          students: []
        };
      }
      acc[offeringKey].students.push({
        enrollment_id: curr.enrollment_id,
        student_name: curr.student_name,
        student_email: curr.student_email,
        grade: curr.grade
      });
      return acc;
    }, {});

    return NextResponse.json({ pendingOfferings: Object.values(groupedOfferings) });

  } catch (error) {
    console.error("Fetch pending grades error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { offeringId } = await req.json();

  if (!offeringId) {
    return NextResponse.json({ error: "offeringId is required" }, { status: 400 });
  }

  try {
    // Release all submitted grades for this offering
    const [result] = await pool.query<any>(
      "UPDATE enrollments SET is_grade_released = TRUE WHERE offering_id = ? AND grade_submitted_to_admin = TRUE AND is_grade_released = FALSE",
      [offeringId]
    );

    return NextResponse.json({ 
      success: true, 
      message: `Released grades for ${result.affectedRows} students.` 
    });

  } catch (error) {
    console.error("Release grades error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
