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
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC"
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validRoles = ["STUDENT", "TEACHER", "ADMIN", "PENDING_ADMIN"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  }

  try {
    // Cannot downgrade the last admin
    if (role !== 'ADMIN') {
      const [admins] = await pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN'"
      );
      const adminCount = admins[0].count;

      const [targetUser] = await pool.query<RowDataPacket[]>(
        "SELECT role FROM users WHERE id = ?", [userId]
      );

      if (targetUser[0]?.role === 'ADMIN' && adminCount <= 1) {
        return NextResponse.json({ error: "Cannot modify the last admin" }, { status: 403 });
      }
    }

    await pool.query(
      "UPDATE users SET role = ? WHERE id = ?",
      [role, userId]
    );

    return NextResponse.json({ success: true, message: "User role updated successfully", role });

  } catch (error) {
    console.error("Update user role error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
