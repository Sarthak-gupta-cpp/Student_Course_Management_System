import { pipeline } from '@xenova/transformers';
import * as pdfParse from 'pdf-parse';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

let embedModel: any = null;
let vectorStore: { embedding: number[], text: string }[] = [];

async function initEmbedModel() {
  if (!embedModel) {
    embedModel = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embedModel;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}

async function chunkText(text: string, chunkSize = 100): Promise<string[]> {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const word of words) {
    if ((currentChunk + word).split(/\s+/).length >= chunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = word + ' ';
    } else {
      currentChunk += word + ' ';
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

async function embedChunks(chunks: string[]): Promise<number[][]> {
  const model = await initEmbedModel();
  const embeddings: number[][] = [];

  for (const chunk of chunks) {
    const output = await model(chunk, { pooling: 'mean', normalize: true });
    embeddings.push(Array.from(output.data));
  }
  return embeddings;
}

async function createVectorStore(chunks: string[], embeddings: number[][]) {
  vectorStore = chunks.map((chunk, i) => ({ embedding: embeddings[i], text: chunk }));
}

async function retrieveRelevantChunks(query: string, topK = 5): Promise<string[]> {
  const model = await initEmbedModel();
  const queryEmbedding = await model(query, { pooling: 'mean', normalize: true });
  const queryVec = Array.from(queryEmbedding.data);

  const similarities = vectorStore.map(item => ({
    similarity: cosineSimilarity(queryVec, item.embedding),
    text: item.text
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, topK).map(item => item.text);
}

async function generateAnswer(query: string, relevantChunks: string[], historyContext?: string): Promise<string> {
  const context = relevantChunks.join('\n');
  const chatHistory = historyContext ? `\nChat History:\n${historyContext}\n---\n` : '';
  const prompt = `
Answer the question based only on the provided context${chatHistory ? ' and the chat history' : ''}. If you cannot answer the question from the context, say "I'm sorry, I don't know".

Format your answer clearly with proper structure, bullet points, and bold text for headings where appropriate. Use markdown formatting for better readability.

Context:
---
${context}
---
${chatHistory}
Question:
---
${query}
---
`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

export async function initializeRAG(pdfPath?: string) {
  let text = '';

  if (pdfPath) {
    // Process PDF
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    text = pdfData.text;
  } else {
    // Use the course info markdown as text
    const mdPath = path.join(process.cwd(), 'course_info.md');
    if (fs.existsSync(mdPath)) {
      text = fs.readFileSync(mdPath, 'utf-8');
    } else {
      // Fallback to hardcoded text
      text = `
Welcome to the Student Course Management System. This system allows students to enroll in courses, view grades, and manage their academic records.
Courses are offered in various semesters. Students can register for courses through the registration page.
Teachers can offer courses and grade students. Admins can manage users, courses, and settings.
The system uses a database to store all information securely.
Authentication is handled via NextAuth with various providers.
The chatbot uses RAG to answer questions based on course information.
`;
    }
  }

  const chunks = await chunkText(text, 30);
  const embeddings = await embedChunks(chunks);
  await createVectorStore(chunks, embeddings);
  console.log('RAG initialized');
}

export { retrieveRelevantChunks, generateAnswer };