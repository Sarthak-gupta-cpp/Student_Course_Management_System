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
    const [courses] = await pool.query<RowDataPacket[]>(
      "SELECT course_id, course_name, credits, department, created_at FROM courses ORDER BY department, course_id"
    );

    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Fetch courses error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { course_id, course_name, credits, department } = body;

  try {
    await pool.query(
      "INSERT INTO courses (course_id, course_name, credits, department) VALUES (?, ?, ?, ?)",
      [course_id, course_name, credits, department]
    );

    return NextResponse.json({ success: true, message: "Course created successfully" });
  } catch (error: any) {
    console.error("Create course error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "Course ID already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
