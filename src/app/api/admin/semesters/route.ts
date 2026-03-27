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
    const [semesters] = await pool.query<RowDataPacket[]>(
      "SELECT semester_id, name, is_current, start_date, end_date FROM semesters ORDER BY start_date DESC"
    );

    return NextResponse.json({ semesters });
  } catch (error) {
    console.error("Fetch semesters error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, is_current, start_date, end_date } = await req.json();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (is_current) {
      await connection.query("UPDATE semesters SET is_current = FALSE");
    }

    await connection.query(
      "INSERT INTO semesters (name, is_current, start_date, end_date) VALUES (?, ?, ?, ?)",
      [name, is_current || false, start_date || null, end_date || null]
    );

    await connection.commit();
    return NextResponse.json({ success: true, message: "Semester created successfully" });
  } catch (error: any) {
    await connection.rollback();
    console.error("Create semester error:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "Semester name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { semester_id, is_current } = await req.json();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (is_current) {
      await connection.query("UPDATE semesters SET is_current = FALSE");
    }

    await connection.query(
      "UPDATE semesters SET is_current = ? WHERE semester_id = ?",
      [is_current, semester_id]
    );

    await connection.commit();
    return NextResponse.json({ success: true, message: "Semester updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Update semester error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    connection.release();
  }
}
