import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "@/lib/db";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const DB_SCHEMA_PROMPT = `
You are an expert SQL assistant for a student course management system.
You MUST construct a valid MySQL SELECT statement based on the user's request.
You have access to a single view called \`my_data\`. Do not use any other tables.

The \`my_data\` view contains the following columns (all related to the specific student asking):
- student_id (int)
- enrollment_status (string: 'ENROLLED' or 'DROPPED')
- grade (string: 'A', 'A-', 'B', etc. or null)
- course_id (string, e.g., 'CS F211')
- course_name (string)
- credits (int)
- department (string)
- semester_name (string)
- teacher_name (string)

Rules:
1. Return ONLY a valid MySQL SELECT statement.
2. NO markdown formatting. NO explanation. NO tags.
3. Only use SELECT.
4. You may filter, group, or average as needed.

Example request: What are my grades?
Example response: SELECT course_name, grade FROM my_data WHERE grade IS NOT NULL;
`;

export async function generateAndRunSQL(userQuery: string, studentId: string): Promise<string> {
  const numericStudentId = parseInt(studentId, 10);
  if (isNaN(numericStudentId)) {
    throw new Error("Invalid student ID");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  // 1. Generate SQL
  const prompt = `${DB_SCHEMA_PROMPT}\n\nUser Request: ${userQuery}\nSQL Query:`;
  const result = await model.generateContent(prompt);
  let rawSql = result.response.text().trim();
  
  rawSql = rawSql.replace(/```sql/ig, "").replace(/```/g, "").trim();

  if (!rawSql.toUpperCase().startsWith("SELECT")) {
    return "I can only run SELECT queries on your data. Please ask a valid question about your courses and grades.";
  }

  // 2. Validate and securely inject scope
  // The LLM writes "FROM my_data". We replace 'my_data' with a dynamically filtered subquery.
  // This guarantees that the user can only ever access rows associated with their own student_id.
  const secureSql = rawSql.replace(
      /\bmy_data\b/gi, 
      `(SELECT * FROM student_dashboard_view WHERE student_id = ${numericStudentId}) AS my_data`
  );

  // 3. Execute query safely
  let dbResults = [];
  try {
      const [rows] = await pool.execute(secureSql);
      dbResults = rows as any[];
  } catch (err: any) {
      console.error("SQL Execution error: ", err.message, "Query:", secureSql);
      return "I encountered an internal database language error while trying to fetch that. Could you ask in a different way?";
  }

  // 4. Summarize answers back to the student
  const summaryPrompt = `
You are a helpful and friendly student advisor assistant. 
Answer the user's question clearly and concisely based ONLY on the following Database Results.
Do NOT mention the SQL query, database structure, or the word 'my_data'. Just give them the answer naturally.
If the Database Results are empty [], you should naturally say you couldn't find any matching records.

User Question: ${userQuery}
Database Results: ${JSON.stringify(dbResults)}

Friendly Answer:
`;

  try {
      const summaryResponse = await model.generateContent(summaryPrompt);
      return summaryResponse.response.text().trim();
  } catch (err: any) {
      console.error("Summary error: ", err);
      // Fallback
      return `I found the following raw data: ${JSON.stringify(dbResults)}`;
  }
}
