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
    const [settings] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM system_settings WHERE id = 1"
    );
    
    return NextResponse.json({ settings: settings[0] || {} });
  } catch (error) {
    console.error("Fetch settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  
  if (!session || !session.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { registration_start, registration_end, drop_start, drop_end } = body;

  const formatDateTime = (val: any) => {
    if (!val) return null;
    try {
      return new Date(val).toISOString().slice(0, 19).replace("T", " ");
    } catch {
      return null;
    }
  };

  try {
    await pool.query(
      `UPDATE system_settings 
       SET 
         registration_start = ?,
         registration_end = ?,
         drop_start = ?,
         drop_end = ?
       WHERE id = 1`,
      [
        formatDateTime(registration_start),
        formatDateTime(registration_end),
        formatDateTime(drop_start),
        formatDateTime(drop_end)
      ]
    );

    return NextResponse.json({ success: true, message: "System settings updated successfully" });

  } catch (error) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
