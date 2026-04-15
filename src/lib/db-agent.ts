import pool from "@/lib/db";
import { generateContent } from "@/lib/groq";

function getPromptForRole(role: string): string {
  const baseRules = `Rules:
1. Return ONLY a valid MySQL SELECT statement.
2. NO markdown formatting. NO explanation. NO tags.
3. Only use SELECT. Everything else is STRICTLY FORBIDDEN.
4. You may filter, group, or average as needed.
5. If calculating GPA or CGPA, you MUST use the following grade points: A=10, A-=9, B=8, B-=7, C=6, C-=5, D=4, E=2, NC=0.
6. The formula for CGPA is SUM(grade_point * credits) / SUM(credits). ONLY include rows where grade IS NOT NULL.
7. CRITICAL: You ONLY have access to the user's specific records. If the user asks a global question like 'how many total students exist in the DB', you MUST return the exact query: SELECT 'I only have access to your personal records.' AS error;`;

  if (role === 'STUDENT') {
    return `You are an expert SQL assistant for a student course management system.
You MUST construct a valid MySQL SELECT statement based on the user's request.
You have access to a view called \`my_data\` and a table called \`system_settings\`. Do not use any other tables.

The \`system_settings\` table contains exactly one row with the globally active system dates:
- registration_start (datetime)
- registration_end (datetime)
- drop_start (datetime)
- drop_end (datetime)
- current_semester_id (int)

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

${baseRules}
Example request: What are my grades?
Example response: SELECT course_name, grade FROM my_data WHERE grade IS NOT NULL;`;
  }
  
  if (role === 'TEACHER') {
    return `You are an expert SQL assistant for a teacher course management system.
You MUST construct a valid MySQL SELECT statement based on the user's request.
You have access to a view called \`my_data\` and a table called \`system_settings\`. Do not use any other tables.

The \`system_settings\` table contains system dates.

The \`my_data\` view contains the following columns (all related to the specific teacher asking):
- teacher_id (int)
- course_id (string, e.g., 'CS F211')
- course_name (string)
- credits (int)
- department (string)
- semester_name (string)
- max_capacity (int)
- current_enrolled (int)

${baseRules}
Example request: What courses am I teaching?
Example response: SELECT course_id, course_name, semester_name FROM my_data;`;
  }

  // ADMIN
  return `You are an expert SQL Admin assistant for a university database.
You MUST construct a valid MySQL SELECT statement based on the user's request.
You have full SELECT access to ALL the following generic tables and views:
- users (id, email, name, role, google_id)
- courses (course_id, course_name, credits, department)
- semesters (semester_id, name, is_current, start_date, end_date)
- course_offerings (offering_id, course_id, semester_id, teacher_id, max_capacity, current_enrolled)
- enrollments (enrollment_id, student_id, offering_id, status, grade, proposed_grade, is_grade_released)
- system_settings (id, registration_start, registration_end, drop_start, drop_end)

${baseRules}
Example request: How many users are registered?
Example response: SELECT COUNT(*) FROM users;`;
}

export async function generateAndRunSQL(userQuery: string, userId: string, role: string): Promise<string> {
  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw new Error("Invalid user ID");
  }

  const DB_SCHEMA_PROMPT = getPromptForRole(role);

  // 1. Generate SQL
  const prompt = `${DB_SCHEMA_PROMPT}\n\nUser Request: ${userQuery}\nSQL Query:`;
  let rawSql = await generateContent(prompt);
  rawSql = rawSql.trim();
  
  rawSql = rawSql.replace(/```sql/ig, "").replace(/```/g, "").trim();

  // Enforce rigid select
  if (!rawSql.toUpperCase().startsWith("SELECT")) {
    return "I can only run SELECT queries on the database to protect data integrity. Please ask a valid reporting question.";
  }

  // Anti-corruption injection check
  if (rawSql.toUpperCase().match(/\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|GRANT|REVOKE)\b/)) {
      return "I can only run SELECT queries on the database. Destructive queries are strictly forbidden.";
  }

  // 2. Validate and securely inject scope
  // If STUDENT or TEACHER, rigidly enforce subquery scoping.
  let secureSql = rawSql;
  if (role === 'STUDENT') {
      secureSql = rawSql.replace(
          /\bmy_data\b/gi, 
          `(SELECT * FROM student_dashboard_view WHERE student_id = ${numericUserId}) AS my_data`
      );
  } else if (role === 'TEACHER') {
      secureSql = rawSql.replace(
          /\bmy_data\b/gi, 
          `(SELECT * FROM teacher_dashboard_view WHERE teacher_id = ${numericUserId}) AS my_data`
      );
  }
  // Admin is allowed to execute natural un-scoped queries directly against core tables

  // 3. Execute query safely
  let dbResults = [];
  try {
      const [rows] = await pool.execute(secureSql);
      dbResults = rows as any[];
  } catch (err: any) {
      console.error("SQL Execution error: ", err.message, "Query:", secureSql);
      return "I encountered an internal database language error while trying to fetch that. Could you ask in a different way?";
  }

  // 4. Summarize answers back to the user
  const summaryPrompt = `
You are a helpful and friendly university assistant. 
Answer the user's question clearly and concisely based ONLY on the following Database Results.
Do NOT mention the SQL query, database structure, or the word 'my_data'. Just give them the answer naturally.
If the Database Results are empty [], you should naturally say you couldn't find any matching records.

User Question: ${userQuery}
Database Results: ${JSON.stringify(dbResults)}

Friendly Answer:
`;

  try {
      const summaryResponse = await generateContent(summaryPrompt);
      return summaryResponse.trim();
  } catch (err: any) {
      console.error("Summary error: ", err);
      // Fallback
      return `I found the following raw data: ${JSON.stringify(dbResults)}`;
  }
}
