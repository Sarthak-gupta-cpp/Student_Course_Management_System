# Backend Management and Integration - Viva Preparation

## Project Overview: Student Course Management System

### Tech Stack
- **Frontend**: Next.js 16.2.1, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Authentication**: NextAuth 5.0, Google OAuth
- **Database**: MySQL with mysql2 driver
- **LLM Integration**: Google Gemini API
- **RAG System**: Xenova Transformers, pdf-parse
- **Styling**: next-themes, Tailwind CSS

---

## 1. Backend Architecture

### API Route Structure
```
src/app/api/
├── admin/
│   ├── courses/
│   ├── grades-approval/
│   ├── offerings/
│   ├── semesters/
│   ├── settings/
│   └── users/
├── auth/[...nextauth]/
├── chat/
├── student/
│   ├── courses/
│   ├── dashboard/
│   ├── drop/
│   ├── enroll/
│   └── grades/
└── teacher/
    └── offerings/
```

### Route Handlers Implementation
- **Type**: Next.js App Router (Server-Side)
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Response Format**: JSON with NextResponse
- **Error Handling**: Try-catch with appropriate status codes

---

## 2. Authentication & Authorization

### Authentication Flow
1. **Provider**: Google OAuth via NextAuth
2. **Session Management**: Cookie-based
3. **User Roles**: ADMIN, TEACHER, STUDENT

### Implementation Details
```typescript
// auth.config.ts
- Configures NextAuth with Google provider
- Manages user sessions
- Handles callbacks for authentication

// middleware.ts
- Route protection based on roles
- Public routes: /, /auth/signin, /auth/error
- Role-based access control (RBAC)
- Redirects unauthorized users
```

### Protected Routes
- `/admin/*` - Admin only
- `/teacher/*` - Teacher and Admin
- `/student/*` - Student and Admin
- `/api/auth/*` - Public auth endpoints

---

## 3. Database Management

### Database Structure
- **Type**: MySQL Relational Database
- **Connection**: mysql2 with connection pooling
- **Location**: `src/lib/db.ts`

### Key Tables (Schema)
```
Users
├── id (PK)
├── email (UNIQUE)
├── password (hashed)
├── role (ENUM: ADMIN, TEACHER, STUDENT)
├── name
└── createdAt

Courses
├── id (PK)
├── code (UNIQUE)
├── title
├── credits
└── description

CourseOfferings
├── id (PK)
├── courseId (FK → Courses)
├── semesterId (FK → Semesters)
├── teacherId (FK → Users)
├── schedule
└── capacity

Enrollments
├── id (PK)
├── studentId (FK → Users)
├── offeringId (FK → CourseOfferings)
├── status (active/dropped)
├── enrollDate
└── grade

Grades
├── id (PK)
├── enrollmentId (FK → Enrollments)
├── marks
├── grade (F, DD, CD, CC, BC, BB, AB, AA)
└── submittedAt
```

### Database Connection Patterns
- Connection pooling for efficiency
- Parameterized queries to prevent SQL injection
- Error handling and reconnection logic

---

## 4. API Integration Points

### 4.1 Admin APIs

#### Course Management
- **GET /api/admin/courses** - Fetch all courses
- **POST /api/admin/courses** - Create new course
- **PUT /api/admin/courses/:id** - Update course
- **DELETE /api/admin/courses/:id** - Delete course

#### User Management
- **GET /api/admin/users** - Fetch all users
- **POST /api/admin/users** - Create user
- **PUT /api/admin/users/:id** - Update user role/info

#### Semester Management
- **GET /api/admin/semesters** - Fetch active semesters
- **POST /api/admin/semesters** - Create semester
- **PUT /api/admin/semesters/:id** - Update semester

#### Grades Approval
- **GET /api/admin/grades-approval** - Pending grade approvals
- **POST /api/admin/grades-approval/:id** - Approve/reject grades

### 4.2 Student APIs

#### Course Enrollment
- **GET /api/student/courses** - Fetch available courses
- **POST /api/student/enroll** - Enroll in course
- **POST /api/student/drop** - Drop course

#### Dashboard
- **GET /api/student/dashboard** - Student statistics & enrolled courses

#### Grades
- **GET /api/student/grades** - Fetch student grades with breakdown

### 4.3 Teacher APIs

#### Course Offering Management
- **GET /api/teacher/offerings** - Fetch teacher's course offerings
- **GET /api/teacher/offerings/:id/students** - Fetch enrolled students

#### Grading
- **POST /api/teacher/offerings/:id/grade** - Submit grades

### 4.4 Chat Integration
- **POST /api/chat** - RAG-based chatbot endpoint
  - Input: User message + chat history
  - Process: Retrieve relevant chunks + Generate response
  - Output: Formatted markdown response

---

## 5. Data Flow & Integration

### User Registration Flow
```
Google OAuth
    ↓
NextAuth Provider
    ↓
Create Session
    ↓
Store User in DB
    ↓
Redirect to Dashboard
```

### Course Enrollment Flow
```
Student Request
    ↓
Validate Student Status
    ↓
Check Prerequisites
    ↓
Check Capacity
    ↓
Insert Enrollment Record
    ↓
Update Availability
    ↓
Return Success/Error
```

### Grading Flow
```
Teacher Submits Grades
    ↓
POST /api/teacher/offerings/:id/grade
    ↓
Calculate Grades from Marks
    ↓
Create Grade Records
    ↓
Admin Approval Workflow
    ↓
POST /api/admin/grades-approval/:id
    ↓
Update Student Records
    ↓
Calculate CGPA
```

### RAG Chatbot Flow
```
User Message
    ↓
Initialize RAG if needed
    ↓
Chunk course_info.md (30 word chunks)
    ↓
Generate Embeddings (Xenova/all-MiniLM-L6-v2)
    ↓
Cosine Similarity Retrieval (top 5)
    ↓
Gemini API with Context
    ↓
Format Response (Markdown)
    ↓
Return to Frontend
```

---

## 6. Error Handling & Validation

### Server-Side Validation
- Request body validation
- Authentication checks
- Authorization (role-based)
- Database constraint checks
- Business logic validation

### Error Response Format
```typescript
{
  error: "Error message",
  status: 400|401|403|500
}
```

### Common HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (invalid data)
- **401**: Unauthorized (not logged in)
- **403**: Forbidden (no permission)
- **404**: Not Found
- **500**: Server Error

---

## 7. Security Practices

### Authentication Security
- NextAuth handles OAuth securely
- Passwords hashed (if applicable)
- Session tokens encrypted
- CSRF protection built-in

### Authorization
- Role checks on all protected routes
- Middleware intercepts requests
- Per-endpoint authorization

### SQL Injection Prevention
- Parameterized queries
- Input validation
- Query escaping

### Environment Variables
- Sensitive data in `.env.local`
- API keys not exposed to client
- Database credentials protected

---

## 8. Performance Considerations

### Database Optimization
- Connection pooling
- Indexes on frequently queried fields
- Query filtering before returning to client

### API Optimization
- Pagination for large datasets
- Request validation before DB queries
- Appropriate status codes

### Frontend Optimization
- Lazy loading with React.lazy
- Code splitting with Next.js
- CSS-in-JS with Tailwind

---

## 9. Middleware & Request Processing

### Middleware Pipeline
```
Request
    ↓
NextAuth Middleware (src/middleware.ts)
    ↓
Check Public Routes
    ↓
Verify Authentication
    ↓
Validate Role
    ↓
Allow/Redirect
```

### Request Lifecycle
1. User makes request
2. Middleware intercepts
3. Session verified
4. Role checked
5. API handler executes
6. Response sent

---

## 10. Integration Points & External Services

### 1. Google OAuth
- Login/Signup provider
- User identity verification
- Token exchange

### 2. Gemini API
- LLM for chatbot responses
- Context-aware generation
- Prompt engineering

### 3. Database
- Persistent data storage
- ACID compliance
- Transaction support

---

## 11. Common Viva Questions & Answers

### Q1: How do you handle authentication across your backend?
**A**: Using NextAuth 5.0 with Google OAuth. When a user logs in, NextAuth creates a secure session stored in cookies. The middleware checks this session on every request and validates the user's role before allowing access to protected routes.

### Q2: Explain your database schema and relationships.
**A**: [Refer to section 3 - Database Management]

### Q3: How does the RAG chatbot integrate with your backend?
**A**: The chatbot uses a dedicated `/api/chat` endpoint. It retrieves relevant information from the course_info.md file using embeddings and cosine similarity, then sends this context to Gemini API for response generation. The response is formatted as markdown and returned to the frontend.

### Q4: How do you prevent unauthorized access to admin routes?
**A**: Role-based access control via middleware. When a request comes to `/admin/*`, middleware checks if the user's role is "ADMIN". If not, it redirects to `/unauthorized`. Same pattern for teacher and student routes.

### Q5: Explain the course enrollment flow.
**A**: [Refer to section 5 - Data Flow & Integration]

### Q6: How do you validate data in your APIs?
**A**: Server-side validation includes type checking, role verification, business logic checks (prerequisites, capacity), and database constraint validation. Invalid requests return 400 status with error details.

### Q7: How is the grading system implemented?
**A**: Teachers submit grades to their course offerings. Grid records are created with marks, then admin approves. Once approved, the system calculates CGPA and stores grades in the Grades table, making them visible to students.

### Q8: What security measures are in place?
**A**: 
- OAuth for authentication (no passwords stored)
- Session management via NextAuth
- Role-based authorization
- Environment variables for secrets
- Parameterized queries for SQL injection prevention

### Q9: Explain your API route structure.
**A**: [Refer to section 1 - Backend Architecture]

### Q10: How do you handle errors in your backend?
**A**: Try-catch blocks around database operations. Appropriate HTTP status codes (400 for validation, 401 for auth, 403 for permission, 500 for server errors). Consistent error response format with error message included.

---

## 12. Key Concepts to Master

### REST API Principles
- Resources identified by routes
- HTTP verbs for operations
- Stateless communication
- Status codes for responses

### Role-Based Access Control (RBAC)
- Users have roles
- Routes require specific roles
- Middleware enforces rules
- Per-endpoint authorization

### Session Management
- Stateless tokens
- Cookie storage
- Expiration handling
- Refresh mechanisms

### Error Handling
- Try-catch blocks
- Status codes
- Error messages
- Logging

### Database Transactions
- ACID properties
- Rollback on failure
- Data consistency

---

## 13. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Frontend                     │
│      (React Components, Tailwind, next-themes)          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│          Middleware (Authentication & RBAC)             │
│              (src/middleware.ts)                         │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│              API Routes (Backend Logic)                 │
│  /api/admin | /api/student | /api/teacher | /api/chat   │
└─────────────────────────────────────────────────────────┘
                    ↙          ↓          ↘
        ┌──────────┴──┬──────────┬──────────┴──────────┐
        ↓             ↓          ↓                      ↓
    ┌────────┐  ┌─────────┐  ┌──────────┐  ┌────────────────┐
    │ MySQL  │  │ Gemini  │  │ Xenova   │  │ File System    │
    │Database│  │   API   │  │Transform │  │(course_info.md)│
    └────────┘  └─────────┘  └──────────┘  └────────────────┘
```

---

## 14. Implementation Highlights

### Connection Pooling
- Maintains multiple DB connections
- Reuses connections
- Improves performance
- Handles concurrent requests

### Middleware Protection
- Fires before route handlers
- Centralized authentication
- Consistent authorization
- Early request rejection

### API Response Format
```typescript
// Success
{ data: {...}, status: 200 }

// Error
{ error: "message", status: 400 }
```

### Session Available In API
```typescript
export async function POST(req: NextRequest) {
  const session = await auth(); // Get session
  if (!session) return new Response("Unauthorized", { status: 401 });
  const role = session.user?.role;
}
```

---

## 15. Potential Questions on Integration

1. **How are multiple services integrated?**
   - Each service (Gemini, DB, filesystem) has dedicated handlers
   - Loosely coupled via API layer
   - Error handling for each service independently

2. **How do you manage state between requests?**
   - Session-based (stateless protocol) via NextAuth
   - Database for persistent state
   - No in-memory state (stateless servers)

3. **How do you ensure data consistency?**
   - Database transactions
   - Validation before operations
   - Rollback on failure
   - ACID compliance

4. **How is the RAG system trained/updated?**
   - Uses course_info.md file
   - On-demand chunking and embedding
   - No persistent vector DB (in-memory only)
   - Can be updated by changing markdown file

5. **How do you scale this system?**
   - Stateless API design
   - Load balancing for multiple instances
   - Database replication
   - Caching layer for frequent queries

---

## Summary

Your backend implements a modern, role-based course management system with:
- **Clean API design** following REST principles
- **Secure authentication** via OAuth
- **RBAC** for authorization
- **Database integration** with proper error handling
- **RAG-based chatbot** for intelligent Q&A
- **Middleware protection** for routes
- **Scalable architecture** ready for production

This is solid backend management and integration work!
