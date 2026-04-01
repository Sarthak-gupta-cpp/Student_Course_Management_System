import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { initializeRAG, retrieveRelevantChunks, generateAnswer } from "@/lib/rag";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

let isInitialized = false;

export async function POST(req: NextRequest) {
  try {
    const { history, message } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { reply: "GEMINI_API_KEY is not set in the environment variables." },
        { status: 500 }
      );
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
