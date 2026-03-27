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
        e.enrollment_id, e.grade,
        co.offering_id, co.semester_id,
        c.course_id, c.course_name, c.credits,
        s.name as semester_name
      FROM enrollments e
      JOIN course_offerings co ON e.offering_id = co.offering_id
      JOIN courses c ON co.course_id = c.course_id
      JOIN semesters s ON co.semester_id = s.semester_id
      WHERE e.student_id = ? AND e.status = 'ENROLLED' AND e.is_grade_released = TRUE
      ORDER BY s.start_date DESC, c.course_id ASC;
    `;

    const [grades] = await pool.query<RowDataPacket[]>(query, [studentId]);

    // Calculate CGPA
    let totalCredits = 0;
    let totalPoints = 0;
    
    // Simplistic translation assuming letter grades A, A-, B, etc.
    const gradePoints: Record<string, number> = {
      'A': 10, 'A-': 9, 'B': 8, 'B-': 7, 'C': 6, 'C-': 5, 'D': 4, 'E': 2, 'NC': 0
    };

    grades.forEach(g => {
      const gpa = gradePoints[g.grade] || 0;
      totalCredits += g.credits;
      totalPoints += (gpa * g.credits);
    });

    const cgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "0.00";

    return NextResponse.json({ grades, cgpa, totalCredits });

  } catch (error) {
    console.error("Fetch grades error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
