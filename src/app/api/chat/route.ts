import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { initializeRAG, retrieveRelevantChunks, generateAnswer } from "@/lib/rag";
import { auth } from "@/lib/auth";
import { generateAndRunSQL } from "@/lib/db-agent";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

let isInitialized = false;

// Intent Router
async function determineIntent(message: string): Promise<'DATABASE' | 'DOCUMENT'> {
    const prompt = `
Analyze the user's question and determine if it requires checking their personal database records (like their enrolled courses, grades, specific schedule, or dropped classes) OR if it is a general knowledge query about the university framework (RAG Document).
Return EXACTLY one word: "DATABASE" or "DOCUMENT".

User Question: ${message}
`;
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const intent = result.response.text().trim().toUpperCase();
    return intent.includes("DATABASE") ? "DATABASE" : "DOCUMENT";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || (session.user.role !== 'STUDENT' && session.user.role !== 'ADMIN')) {
        return NextResponse.json({ reply: "You must be securely logged in to execute personal queries against the database." }, { status: 401 });
    }

    const { history, message } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { reply: "GEMINI_API_KEY is not set in the environment variables." },
        { status: 500 }
      );
    }

    const intent = await determineIntent(message);
    
    if (intent === 'DATABASE') {
        const responseText = await generateAndRunSQL(message, session.user.id!);
        return NextResponse.json({ reply: responseText });
    }

    // Initialize RAG if not done
    if (!isInitialized) {
      await initializeRAG();
      isInitialized = true;
    }

    // Build history context
    const historyContext = history.slice(-5).map((h: any) => `${h.role === 'user' ? 'User' : 'Bot'}: ${h.content}`).join('\n');

    // Retrieve relevant chunks
    const relevantChunks = await retrieveRelevantChunks(message);

    // Generate answer
    const responseText = await generateAnswer(message, relevantChunks, historyContext);

    return NextResponse.json({ reply: responseText });
  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
