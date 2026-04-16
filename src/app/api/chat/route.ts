import { generateContent } from "@/lib/groq";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateAndRunSQL } from "@/lib/db-agent";
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// Intent Router
async function determineIntent(message: string): Promise<'DATABASE' | 'DOCUMENT'> {
    const prompt = `
Analyze the user's question. If the question requires fetching data from a database (such as information about users, students, courses, enrollments, capacity, schedules, grades, statistics, or settings), return EXACTLY one word: "DATABASE". 
If it is a general knowledge question about the university's rules, grading guidelines, or static framework policies, return "DOCUMENT".

User Question: ${message}
`;
    const result = await generateContent(prompt);
    const intent = result.trim().toUpperCase();
    return intent.includes("DATABASE") ? "DATABASE" : "DOCUMENT";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || (session.user.role !== 'STUDENT' && session.user.role !== 'TEACHER' && session.user.role !== 'ADMIN')) {
        return NextResponse.json({ reply: "You must be securely logged in to execute personal queries against the database." }, { status: 401 });
    }

    const { history, message } = await req.json();

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { reply: "GROQ_API_KEY is not set in the environment variables." },
        { status: 500 }
      );
    }

    const intent = await determineIntent(message);
    
    if (intent === 'DATABASE') {
        const responseText = await generateAndRunSQL(message, session.user.id!, session.user.role!);
        return NextResponse.json({ reply: responseText });
    }

    // Provide static context information
    let siteInfo = "Welcome to the Student Course Management System. This system allows students to enroll in courses, view grades, and manage their academic records.";
    try {
      const mdPath = path.join(process.cwd(), 'course_info.md');
      if (fs.existsSync(mdPath)) {
        siteInfo = fs.readFileSync(mdPath, 'utf-8');
      }
    } catch (e) {
      console.warn("Could not read course_info.md, using default fallback info.");
    }

    // Build history context
    const historyContext = history.slice(-5).map((h: any) => `${h.role === 'user' ? 'User' : 'Bot'}: ${h.content}`).join('\n');

    const prompt = `
Answer the question based ONLY on the provided system context and the chat history. If you cannot answer it, simply say "I'm sorry, I don't know based on the provided context."

Format your answer clearly with proper structure, bullet points, and bold text for headings where appropriate. Use markdown formatting.

System Context:
---
${siteInfo}
---

Chat History:
---
${historyContext}
---

Question:
---
${message}
---
`;

    const responseText = await generateContent(prompt);

    return NextResponse.json({ reply: responseText });
  } catch (error: any) {
    console.error("Chat Error:", error);
    
    // Default error message
    let errorMessage = "I'm having trouble connecting right now. Please try again later.";
    
    // Check for common API key exhaustion or rate limit indicators
    const errorString = String(error).toLowerCase();
    if (errorString.includes("quota") || errorString.includes("429") || errorString.includes("rate limit") || errorString.includes("exhausted")) {
      errorMessage = "My API key quota has been exhausted. Please try again later or contact the administrator to update the API key.";
    }

    return NextResponse.json(
      { reply: errorMessage, error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
