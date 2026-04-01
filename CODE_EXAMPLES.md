# Backend Code Examples & Implementation Details

## 1. Authentication & Middleware

### Session Access in API Routes
```typescript
// src/app/api/student/dashboard/route.ts
import { auth } from "@/auth.config";

export async function GET(req: NextRequest) {
  const session = await auth();
  
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const userId = session.user?.id;
  const role = session.user?.role;
  
  // Fetch student-specific data
  return NextResponse.json({ data: {...} });
}
```

### Role-Based Protection
```typescript
// middleware.ts excerpt
export default auth((req) => {
  const role = req.auth?.user?.role;
  
  // Admin-only route
  if (req.nextUrl.pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }
  
  // Teacher or Admin route
  if (req.nextUrl.pathname.startsWith("/teacher") && 
      role !== "TEACHER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }
  
  return NextResponse.next();
});
```

---

## 2. Database Operations

### Connection & Query Example
```typescript
// src/lib/db.ts
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function executeQuery(sql: string, values?: any[]) {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(sql, values || []);
    connection.release();
    return results;
  } catch (error) {
    console.error("Database Error:", error);
    throw error;
  }
}
```

### Course Enrollment
```typescript
// Single enrollment transaction
const sql = `
  INSERT INTO enrollments (studentId, offeringId, status, enrollDate)
  VALUES (?, ?, 'active', NOW())
`;
const result = await executeQuery(sql, [studentId, offeringId]);
```

### Fetching Enrolled Courses with Details
```typescript
const sql = `
  SELECT c.id, c.code, c.title, c.credits, 
         co.id as offeringId, u.name as teacherName
  FROM enrollments e
  JOIN courseofferings co ON e.offeringId = co.id
  JOIN courses c ON co.courseId = c.id
  JOIN users u ON co.teacherId = u.id
  WHERE e.studentId = ? AND e.status = 'active'
`;
const courses = await executeQuery(sql, [studentId]);
```

---

## 3. RAG Chatbot Backend

### Initialization
```typescript
// src/lib/rag.ts
export async function initializeRAG(pdfPath?: string) {
  let text = '';
  
  if (pdfPath) {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    text = pdfData.text;
  } else {
    // Read from markdown file
    const mdPath = path.join(process.cwd(), 'course_info.md');
    if (fs.existsSync(mdPath)) {
      text = fs.readFileSync(mdPath, 'utf-8');
    }
  }
  
  const chunks = await chunkText(text, 30);
  const embeddings = await embedChunks(chunks);
  await createVectorStore(chunks, embeddings);
}
```

### Embedding Generation
```typescript
async function embedChunks(chunks: string[]): Promise<number[][]> {
  const model = await initEmbedModel(); // Xenova model
  const embeddings: number[][] = [];
  
  for (const chunk of chunks) {
    // Generate embedding using sentence-transformers
    const output = await model(chunk, { 
      pooling: 'mean', 
      normalize: true 
    });
    embeddings.push(Array.from(output.data));
  }
  return embeddings;
}
```

### Similarity-based Retrieval
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (normA * normB);
}

async function retrieveRelevantChunks(
  query: string, 
  topK = 5
): Promise<string[]> {
  const model = await initEmbedModel();
  const queryEmbedding = await model(query, { 
    pooling: 'mean', 
    normalize: true 
  });
  const queryVec = Array.from(queryEmbedding.data);
  
  const similarities = vectorStore.map(item => ({
    similarity: cosineSimilarity(queryVec, item.embedding),
    text: item.text
  }));
  
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, topK).map(item => item.text);
}
```

### Chat API Handler
```typescript
// src/app/api/chat/route.ts
let isInitialized = false;

export async function POST(req: NextRequest) {
  try {
    const { history, message } = await req.json();
    
    // Initialize RAG once
    if (!isInitialized) {
      await initializeRAG();
      isInitialized = true;
    }
    
    // Build history context
    const historyContext = history
      .slice(-5)
      .map((h: any) => 
        `${h.role === 'user' ? 'User' : 'Bot'}: ${h.content}`
      )
      .join('\n');
    
    // Retrieve relevant chunks
    const relevantChunks = await retrieveRelevantChunks(message);
    
    // Generate answer with Gemini
    const responseText = await generateAnswer(
      message, 
      relevantChunks, 
      historyContext
    );
    
    return NextResponse.json({ reply: responseText });
  } catch (error) {
    console.error("Chat Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
```

### Gemini Response Generation
```typescript
async function generateAnswer(
  query: string, 
  relevantChunks: string[], 
  historyContext?: string
): Promise<string> {
  const context = relevantChunks.join('\n');
  const chatHistory = historyContext 
    ? `\nChat History:\n${historyContext}\n---\n` 
    : '';
  
  const prompt = `
Answer the question based only on the provided context${
  chatHistory ? ' and the chat history' : ''
}. If you cannot answer from the context, say "I'm sorry, I don't know".

Format your answer clearly with proper structure, bullet points, and bold text for headings.

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
  
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash' 
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}
```

---

## 4. API Endpoint Examples

### Admin: Create Course
```typescript
// POST /api/admin/courses
export async function POST(req: NextRequest) {
  const session = await auth();
  
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  
  const { code, title, credits, description } = await req.json();
  
  // Validation
  if (!code || !title || !credits) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }
  
  try {
    const sql = `
      INSERT INTO courses (code, title, credits, description)
      VALUES (?, ?, ?, ?)
    `;
    const result = await executeQuery(sql, 
      [code, title, credits, description]
    );
    
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
```

### Student: Enroll in Course
```typescript
// POST /api/student/enroll
export async function POST(req: NextRequest) {
  const session = await auth();
  const { offeringId } = await req.json();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    // Check if already enrolled
    const checkSql = `
      SELECT id FROM enrollments 
      WHERE studentId = ? AND offeringId = ?
    `;
    const existing = await executeQuery(checkSql, 
      [session.user.id, offeringId]
    );
    
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Already enrolled" },
        { status: 400 }
      );
    }
    
    // Enroll student
    const enrollSql = `
      INSERT INTO enrollments (studentId, offeringId, status, enrollDate)
      VALUES (?, ?, 'active', NOW())
    `;
    const result = await executeQuery(enrollSql, 
      [session.user.id, offeringId]
    );
    
    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Enrollment failed" },
      { status: 500 }
    );
  }
}
```

### Teacher: Submit Grades
```typescript
// POST /api/teacher/offerings/:id/grade
export async function POST(req: NextRequest, 
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const { grades } = await req.json(); // [{enrollmentId, marks}, ...]
  
  if (session?.user?.role !== "TEACHER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  
  try {
    // Insert grades
    for (const { enrollmentId, marks } of grades) {
      const gradeValue = calculateGrade(marks);
      const sql = `
        INSERT INTO grades (enrollmentId, marks, grade, submittedAt)
        VALUES (?, ?, ?, NOW())
      `;
      await executeQuery(sql, [enrollmentId, marks, gradeValue]);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to submit grades" },
      { status: 500 }
    );
  }
}
```

---

## 5. Error Handling Patterns

### Try-Catch with Specific Errors
```typescript
try {
  const connection = await pool.getConnection();
  const [results] = await connection.execute(sql, values);
  connection.release();
  return results;
} catch (error: any) {
  if (error.code === 'ER_DUP_ENTRY') {
    return { error: "Duplicate entry", status: 400 };
  }
  if (error.code === 'ER_BAD_FIELD_ERROR') {
    return { error: "Invalid field", status: 400 };
  }
  return { error: "Database error", status: 500 };
}
```

### Input Validation
```typescript
function validateCourseInput(data: any) {
  const errors = [];
  
  if (!data.code || typeof data.code !== 'string') {
    errors.push("Course code is required");
  }
  if (!data.title || typeof data.title !== 'string') {
    errors.push("Course title is required");
  }
  if (!data.credits || typeof data.credits !== 'number') {
    errors.push("Credits must be a number");
  }
  
  return errors.length > 0 ? { errors, valid: false } : { valid: true };
}
```

---

## 6. Performance Considerations

### Query Optimization
```typescript
// Use indexes
// SELECT * FROM enrollments WHERE studentId = ? (indexed)

// Use joins instead of multiple queries
const sql = `
  SELECT e.*, c.title, o.schedule
  FROM enrollments e
  JOIN courseofferings o ON e.offeringId = o.id
  JOIN courses c ON o.courseId = c.id
  WHERE e.studentId = ?
`;
```

### Pagination
```typescript
// GET /api/courses?page=1&limit=10
const limit = Math.min(parseInt(limit || '10'), 100);
const offset = (parseInt(page || '1') - 1) * limit;

const sql = `
  SELECT * FROM courses LIMIT ? OFFSET ?
`;
const courses = await executeQuery(sql, [limit, offset]);
```

---

## 7. Integration Testing Scenarios

### Test 1: Student Enrollment Flow
```
1. Student logs in → session created
2. Student views available courses → GET /api/student/courses
3. Student enrolls in course → POST /api/student/enroll
4. Student views dashboard → GET /api/student/dashboard
5. Verify enrollment in DB
```

### Test 2: Grading Flow
```
1. Teacher logs in
2. Teacher posts grades → POST /api/teacher/offerings/:id/grade
3. Grades pending approval → GET /api/admin/grades-approval
4. Admin approves → POST /api/admin/grades-approval/:id
5. Student views grades → GET /api/student/grades
```

### Test 3: RAG Chatbot
```
1. Initialize chatbot → load course_info.md
2. Generate embeddings → store in memory
3. User asks question → retrieve relevant chunks
4. Gemini responds with context
5. Return formatted markdown
```

---

## 8. Security Implementation

### Parameterized Queries
```typescript
// ✅ SAFE
const sql = "SELECT * FROM users WHERE email = ?";
executeQuery(sql, [userEmail]);

// ❌ UNSAFE
const sql = `SELECT * FROM users WHERE email = '${userEmail}'`;
```

### Environment Variables
```
.env.local
├── GEMINI_API_KEY=***
├── DB_HOST=localhost
├── DB_USER=root
├── DB_PASSWORD=***
├── NEXTAUTH_SECRET=***
└── AUTH_GOOGLE_ID=***
```

### Session Verification
```typescript
// Every protected route
const session = await auth();
if (!session) return NextResponse.json({error: "Unauthorized"}, {status: 401});
```

---

## 9. Commonly Asked Implementation Questions

**Q: How do you ensure thread-safety with connection pooling?**
A: The mysql2 library handles this automatically. Each connection is exclusive to a request until released back to the pool.

**Q: How do you handle concurrent grade submissions?**
A: Database transactions ensure data consistency. Each submission is atomic.

**Q: How does the embedding model handle new data?**
A: It re-initializes from the updated markdown file. No persistence across restarts.

**Q: How do you prevent duplicate enrollments?**
A: Check for existing enrollment before insert using UNIQUE constraint or SELECT query.

**Q: What happens if Gemini API fails?**
A: Caught in try-catch, returns 500 error to chatbot on frontend.

---

## Key Takeaways for Viva

1. **Authentication**: OAuth via NextAuth, session-based
2. **Authorization**: RBAC via middleware on all routes
3. **Database**: MySQL with connection pooling, parameterized queries
4. **APIs**: RESTful endpoints for each role (admin, teacher, student)
5. **Integration**: Gemini API for chatbot, RAG for context retrieval
6. **Error Handling**: Consistent try-catch, proper status codes
7. **Security**: Environment variables, SQL injection prevention, session verification
8. **Performance**: Indexes, connection pooling, pagination

You're well-prepared! Good luck! 🚀
