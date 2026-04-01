import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // We only want students using this agent safely
    if (session.user.role !== "STUDENT" && session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Proxy the request to the Python FastAPI backend
    const fastApiUrl = process.env.CHATBOT_API_URL || "http://127.0.0.1:8000/ask";
    
    console.log(`Sending query to chatbot API for student ${session.user.id}:`, query);
    
    // Use the custom id as student_id
    const response = await fetch(fastApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        student_id: parseInt(session.user.id),
        query: query
      })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("Chatbot API Error:", response.status, errText);
        return NextResponse.json({ error: "Failed to communicate with DB Agent" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Chat proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
