# Viva Practice Questions & Answers

## Section 1: Architecture & Design

### Q1: Explain your overall system architecture
**Answer Structure**:
- Start with tech stack
- Explain layers (Frontend, Backend, Database)
- Show how they interact
- Mention integration points

**Sample Answer**:
"My system uses Next.js for both frontend and backend. The frontend is React-based with Tailwind CSS for styling. The backend consists of Next.js API Routes - essentially Node.js endpoints that handle business logic. For persistence, I use MySQL with connection pooling. The system integrates with Google OAuth for authentication, Gemini API for the chatbot, and uses Xenova for embedding generation. Data flows through a stateless architecture, making it horizontally scalable."

---

### Q2: Why did you choose Next.js for backend instead of Express?
**Answer**:
- Next.js provides API Routes (simpler setup)
- Integrated typescript support
- Middleware support
- Hot reload during development
- File-based routing reduces boilerplate
- SSR capability if needed
- Single deployment unit

---

### Q3: Draw and explain your database schema
**Answer**:
- Draw 8-10 tables on paper/board
- Show primary keys (PK) and foreign keys (FK)
- Explain relationships (1-to-1, 1-to-many, many-to-many)
- Show which fields have indexes
- Explain why normalization was chosen

**Key Relationships**:
```
Users → CourseOfferings (one teacher, many offerings)
Users → Enrollments (one student, many enrollments)
CourseOfferings → Enrollments (one offering, many students)
Enrollments → Grades (one enrollment, one grade)
Courses → CourseOfferings (one course, many semesters)
Semesters → CourseOfferings (one semester, many offerings)
```

---

### Q4: How does your middleware work?
**Answer**:
"My middleware in Next.js runs before every request. It first checks if the route is public (no auth needed). If it's a protected route, it verifies the NextAuth session exists. Then it checks the user's role:
- If accessing /admin, only ADMIN role allowed
- If accessing /teacher, TEACHER or ADMIN allowed
- If accessing /student, STUDENT or ADMIN allowed

If authorization fails, it redirects to /unauthorized. Otherwise, the request continues to the API handler. This centralized approach ensures every request is protected."

---

### Q5: Explain your choice of authentication method
**Answer**:
"I chose OAuth via Google instead of traditional username/password for several reasons:
1. Security: No passwords stored on our servers
2. User convenience: Single sign-on (SSO)
3. Proven security: Leverages Google's infrastructure
4. Session management: NextAuth handles token refresh automatically
5. Scalability: No password database to maintain

NextAuth creates an encrypted cookie-based session after user login, which is verified on every protected request."

---

## Section 2: Database & Data Management

### Q6: How do you handle concurrent database requests?
**Answer**:
"I use MySQL connection pooling with a pool size of 10 connections. When a request comes in, it gets a connection from the pool. If no connection is available, it waits in queue. Once the query completes, the connection returns to the pool for reuse.

This approach:
- Reuses connections (expensive to create)
- Handles multiple concurrent requests efficiently
- Prevents database connection exhaustion
- Provides automatic connection management"

---

### Q7: How do you prevent SQL injection attacks?
**Answer**:
"I use parameterized queries exclusively:
```
WRONG: SELECT * FROM users WHERE email = '${userEmail}'
RIGHT: const sql = 'SELECT * FROM users WHERE email = ?'
       executeQuery(sql, [userEmail])
```

This separates SQL logic from data. The parameters are escaped by the mysql2 driver, preventing any SQL injection. Even if userEmail contains malicious SQL, it's treated as a string literal, not executable code."

---

### Q8: Explain your enrollment flow with database operations
**Answer**:
"When a student enrolls:
1. Query: Check if already enrolled with 'SELECT id FROM enrollments WHERE studentId=? AND offeringId=?'
2. If exists, return 400 (Conflict)
3. If not, INSERT into enrollments table with: studentId, offeringId, status='active', enrollDate=NOW()
4. Return 201 with new enrollment ID

This prevents duplicates and ensures data consistency. If INSERT fails due to constraints, error is caught and returned to user."

---

### Q9: How do you calculate CGPA?
**Answer**:
"CGPA is calculated as:
```
CGPA = (Sum of (Grade Points × Credits)) / Total Credits

Example:
Math (10 pts, 3 credits) = 30
Physics (8 pts, 4 credits) = 32
Chemistry (9 pts, 3 credits) = 27
Total = 89 / 10 = 8.9 CGPA
```

This is typically calculated in the API when fetching student grades/dashboard."

---

### Q10: Walk through the grading workflow with database changes
**Answer**:
"Teacher submits grades → Intermediate store in memory/temp table → Admin views pending approvals → Admin approves → Update Grades table → Calculate CGPA → Visible in student dashboard.

Database operations:
1. INSERT into grades table with marks
2. SELECT from grades WHERE status='pending'
3. UPDATE grades SET status='approved' WHERE id=?
4. JOIN query to calculate CGPA
5. UPDATE user records if needed"

---

## Section 3: APIs & Integration

### Q11: List and briefly explain each API endpoint
**Answer**:
"I have 3 main API groups:

**Admin APIs** (/api/admin):
- /courses: CRUD for courses
- /users: Manage users and roles
- /semesters: CRUD semesters
- /grades-approval: Approve/reject grades
- /offerings: Manage course offerings
- /settings: System settings

**Student APIs** (/api/student):
- /courses: View available courses
- /enroll: POST to enroll
- /drop: POST to drop course
- /grades: View grades and CGPA
- /dashboard: Statistics and enrolled courses

**Teacher APIs** (/api/teacher):
- /offerings: View assigned courses
- /offerings/:id/students: View enrolled students
- (Grading: POST marks)

**Shared APIs**:
- /api/auth/[...nextauth]: Authentication
- /api/chat: RAG chatbot"

---

### Q12: How do you handle API errors and return responses?
**Answer**:
"Every API follows a consistent pattern:

```typescript
try {
  // Validate request
  if (!requiredField) {
    return NextResponse.json(
      { error: "Field required" },
      { status: 400 }
    );
  }
  
  // Check authorization
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  // Execute operation
  const result = await executeQuery(sql, values);
  
  return NextResponse.json({ data: result }, { status: 200 });
} catch (error) {
  console.error(error);
  return NextResponse.json(
    { error: "Server error" },
    { status: 500 }
  );
}
```

HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error"

---

### Q13: Explain the Gemini API integration in your chatbot
**Answer**:
"The chatbot uses Gemini API with this flow:

1. On first user message, RAG initializes
2. Load course_info.md file
3. Chunk text into 30-word pieces
4. Generate embeddings for each chunk using Xenova
5. When user asks question:
   - Embed the user's query
   - Use cosine similarity to find top 5 relevant chunks
   - Build prompt with: context chunks + chat history + user question
   - Call Gemini API with constructed prompt
   - Gemini generates response using RAG context
   - Format as markdown
   - Send to frontend

This combines rule-based retrieval (RAG) with generative AI (Gemini) for accurate, context-grounded responses."

---

### Q14: Why do you need RAG (Retrieval-Augmented Generation)?
**Answer**:
"RAG solves the LLM hallucination problem. Without RAG:
- Gemini might generate plausible-sounding but false answers
- No way to verify answers against source material

With RAG:
- Only answers based on retrieved course information
- User can verify answers against provided context
- Reduces hallucinations dramatically
- Grounds responses in facts
- Says 'I don't know' when not in context"

---

### Q15: How do you handle the RAG initialization?
**Answer**:
"```typescript
let isInitialized = false;

export async function POST(req) {
  if (!isInitialized) {
    await initializeRAG();
    isInitialized = true;
  }
  // ... rest of logic
}

export async function initializeRAG() {
  // Read course_info.md
  const text = fs.readFileSync(mdPath, 'utf-8');
  
  // Chunk into 30-word pieces
  const chunks = chunkText(text, 30);
  
  // Generate embeddings for each chunk
  const embeddings = embedChunks(chunks);
  
  // Store in memory
  vectorStore = chunks.map((chunk, i) => ({
    embedding: embeddings[i],
    text: chunk
  }));
}
```

This lazy initialization happens once on first chat message, improving startup time."

---

## Section 4: Security & Performance

### Q16: What are your security best practices?
**Answer**:
"1. Authentication: OAuth (no passwords stored)
2. Authorization: RBAC via middleware
3. Session Security: Encrypted cookies with httponly flag
4. SQL Security: Parameterized queries
5. Secrets: Environment variables (.env.local)
6. Validation: Server-side + database constraints
7. Error Handling: No sensitive info in error messages
8. Rate Limiting: Can be added via middleware
9. Data Encryption: Future improvement
10. HTTPS: Required in production"

---

### Q17: How would you optimize performance?
**Answer**:
"Current optimizations:
- Connection pooling (reuse DB connections)
- Indexes on frequently queried columns
- Pagination for large datasets

Future optimizations:
- Redis caching for student dashboards
- Cache embeddings (don't regenerate on startup)
- Compression middleware
- Database query result caching
- CDN for static assets
- Load balancer for multiple instances
- Database replication (read replicas)"

---

### Q18: How do you handle large file uploads (for grades)?
**Answer**:
"Currently: Teachers enter grades one-by-one through forms

For bulk uploads:
- Accept CSV file upload
- Parse CSV on server
- Validate each row
- Batch insert if valid
- Return errors for invalid rows
- Show success/failure summary

Security: Validate file type, size limits, content validation before DB insert."

---

### Q19: What happens if the database is slow?
**Answer**:
"Symptoms: API responses take > 5 seconds

Investigation:
- Check slow query log
- Add indexes if needed
- Review query plan
- Optimize joins
- Consider caching

Solutions:
- Add indexes on foreign keys and filter columns
- Implement pagination
- Use read replica for reporting queries
- Cache popular queries (student dashboard)
- Archive old enrollment data"

---

### Q20: What's your disaster recovery plan?
**Answer**:
"- Daily automated database backups
- Backup stored separately from production
- Point-in-time recovery capability
- Automated health checks
- Failover to backup DB if needed
- Load balancer redirects traffic
- Session data not critical (would recreate)
- API is stateless (can be restarted)"

---

## Section 5: Scenarios & Problem-Solving

### Q21: A student is shown grades but they're not approved by admin. How do you fix this?
**Answer**:
"The bug is likely that we're querying grades without checking approval status.

Fix:
```typescript
// WRONG
SELECT * FROM grades WHERE studentId = ?

// RIGHT
SELECT * FROM grades 
WHERE studentId = ? AND status = 'approved'
```

Or add approval check in API:
```typescript
const approvedGrades = grades.filter(g => g.status === 'approved');
```

This ensures only approved grades are visible to students."

---

### Q22: Two teachers are grading simultaneously and getting conflicts. Help!
**Answer**:
"This could be database locking issue. Solutions:

1. Add optimistic locking:
```sql
UPDATE grades SET marks=?, version=version+1
WHERE id=? AND version=?
```

2. Add pessimistic locking:
```sql
SELECT * FROM grades WHERE id=? FOR UPDATE
```

3. Queue submissions:
- Store in pending table
- Process sequentially
- Admin resolves conflicts

My preference: Optimistic locking + retry logic in the frontend."

---

### Q23: Your API response time degrades over time. Why?
**Answer** possibilities:
1. Database: Not releasing connections properly → Add finally block to executeQuery
2. Memory: Embeddings loaded multiple times → Initialize once with caching
3. Logs: Growing quickly → Implement log rotation
4. Cache: Stale data → Implement cache invalidation
5. Connections: Pool exhausted → Increase pool size or find leaks

Debug approach:
- Monitor connection count
- Check memory usage
- Review logs for N+1 queries
- Use APM tool (New Relic, Datadog)"

---

### Q24: Student says they can see other students' grades. Security breach!
**Answer**:
"Immediate actions:
1. Revoke affected sessions
2. Audit all grade queries
3. Check API authorization

Root cause check:
```typescript
// WRONG - Missing studentId check
const sql = 'SELECT * FROM grades';

// RIGHT
const sql = 'SELECT * FROM grades WHERE enrollmentId IN (SELECT id FROM enrollments WHERE studentId = ?)';
```

Or in middleware:
```typescript
if (pathname.includes('/grades') && role !== 'ADMIN') {
  verify studentId in request === authenticated user's ID
}
```

Prevention:
- Audit logging for all data access
- Automated tests for authorization
- Regular security reviews"

---

### Q25: How would you handle a 10x traffic spike?
**Answer**:
"Short-term (minutes):
- Auto-scaling: More API instances
- Load balancer routes traffic
- Connection pool handles spike

Medium-term (hours):
- Database reads to replica
- Implement caching (Redis)
- Rate limiting to protect system
- Static content to CDN

Long-term (days):
- Database optimization/indexing
- Query result caching
- Archive old data
- Add more database resources"

---

## Section 6: Advanced Questions

### Q26: Explain eventual consistency vs strong consistency
**Answer**:
"Strong Consistency (my system):
- Write happens, immediately visible
- Slightly slower but guarantees accurate data
- Example: Grade submission → immediately visible

Eventual Consistency:
- Write happens, visible after delay
- Faster but temporary lag
- Example: Social media likes

I chose strong consistency because education data (grades) must be accurate. Lag is unacceptable."

---

### Q27: How do you implement soft deletes vs hard deletes?
**Answer**:
"Soft Delete: Add is_deleted flag
```sql
UPDATE users SET is_deleted = true WHERE id = ?
SELECT * FROM users WHERE is_deleted = false
```

Hard Delete: Actually remove data
```sql
DELETE FROM users WHERE id = ?
```

My approach:
- Soft delete for: Users, Enrollments (audit trail needed)
- Hard delete for: Temporary/cache data
- Soft delete preserves history (important for grades)"

---

### Q28: Design a notification system - how would you integrate?
**Answer**:
"Architecture:
1. Add notifications table
2. On grade approval → insert notification
3. Webhook to email service
4. Polling or websocket for real-time

```typescript
// After grade approval
INSERT INTO notifications (userId, message, type)
VALUES (studentId, 'Your grade for Math is ready', 'grade')

// Frontend polling
GET /api/notifications?since=lastCheck
```

For scale: Message queue (RabbitMQ) + worker process."

---

### Q29: How would you implement course prerequisites?
**Answer**:
"Database schema:
```sql
CREATE TABLE coursePrerequisites (
  id INT PRIMARY KEY,
  courseId INT (the course being taken),
  prerequisiteId INT (must complete first)
)
```

API logic:
```typescript
// Before enrollment
const prereqs = SELECT prerequisiteId FROM coursePrerequisites WHERE courseId = ?

// Check student completed each
FOR each prerequisiteId:
  SELECT status FROM grades WHERE studentId = ? AND courseId = prerequisiteId
  IF not 'passed': return 400 error
  
// Only then allow enrollment
```"

---

### Q30: How would you audit all changes made to grades?
**Answer**:
"Create audit table:
```sql
CREATE TABLE auditLog (
  id INT,
  action VARCHAR (UPDATE/INSERT/DELETE),
  table VARCHAR,
  recordId INT,
  oldValue TEXT,
  newValue TEXT,
  userId INT,
  timestamp DATETIME
)
```

Trigger on grade updates:
```typescript
// After UPDATE grades
INSERT INTO auditLog (
  action, table, recordId, oldValue, newValue, userId, timestamp
) VALUES (
  'UPDATE', 'grades', gradeId, previousMarks, newMarks, adminId, NOW()
)
```

Admin can review: GET /api/admin/audit-log"

---

## Tips for Answering Viva Questions

### Good Practice
✅ Start with the highest-level understanding
✅ Provide specific code examples when asked
✅ Explain your reasoning for design choices
✅ Mention trade-offs you considered
✅ Show understanding of security implications
✅ Relate answers back to your project
✅ Ask clarifying questions if unsure
✅ Admit when you don't know: "I haven't implemented that, but here's how I would..."

### Bad Practice
❌ Give super technical answer without explaining
❌ Make up features you don't have
❌ Claim 100% security (no system is perfect)
❌ Blame framework/language for design choices
❌ Hesitate to dive into code details
❌ Provide generic answers (personalize!)
❌ Rush through complex concepts
❌ Get defensive about decisions

---

## Final Prep Checklist

1. day before:
- [ ] Read VIVA_PREPARATION.md thoroughly
- [ ] Review CODE_EXAMPLES.md with code fresh in mind
- [ ] Practice explaining architecture to yourself
- [ ] Identify 3-4 key integration challenges you solved

Day of:
- [ ] Review QUICK_REFERENCE.md for last-minute facts
- [ ] Practice first 5 answers out loud
- [ ] Get good sleep (night before)
- [ ] Have code ready to show on screen
- [ ] Prepare demo flow (login → enroll → check grades)

During:
- [ ] Listen carefully to questions
- [ ] Don't rush answers
- [ ] Draw diagrams when helpful
- [ ] Show confidence in your work
- [ ] It's OK to pause and think!

---

**Good luck! You've got this!** 🎓🚀

Remember: Your system is solid, well-integrated, and demonstrates real problem-solving. The examiners want to see that you understand *why* you made your choices, not just *what* you built.

**Be confident, be clear, be yourself!**
