# Student Excel Import and Student Auth Report

## Current Project Findings

This repository already contains important parts of the requested feature:

- Excel student bulk import already exists in `backend/src/modules/students/students.service.js`
- Admin bulk upload UI already exists in `frontend/src/pages/students/StudentsListPage.jsx`
- Dashboard and reports already read student data from the database in `backend/src/modules/reports/reports.service.js`
- Login already exists in `backend/src/modules/auth/*`

Main gaps against the requested behavior:

- There is no student self-signup route yet
- Current bulk import skips duplicate students instead of updating existing rows
- Current import uses some default values instead of strict `null` storage for missing Excel values
- Domain restriction for student auth using `@kbtcoe.org` is not enforced yet
- There is no import batch history table for reporting and traceability

## Recommended Business Flow

Best production-safe flow for this project:

1. Admin/TPO uploads the official Excel sheet.
2. Backend parses the sheet and creates or updates `User` and `Student` records.
3. Empty Excel values are stored as `null` wherever the schema allows nulls.
4. Each imported student gets a `STUDENT` user account linked to `college_email`.
5. Only `@kbtcoe.org` email addresses are allowed for student authentication.
6. Student signs in using college email and password stored in backend as a hash.
7. Dashboard automatically reflects imported data because reports already read from the `Student` table.

Recommended product decision:

- If admin import is the source of truth, student open signup should be limited.
- Safer option: student can only activate or use an already imported account.
- This avoids fake registrations and duplicate student records.

## Recommended Schema Changes

These changes fit the current Prisma/PostgreSQL stack.

### Prisma Schema Additions

```prisma
enum ImportStatus {
  SUCCESS
  FAILED
  SKIPPED
}

model User {
  id                     String      @id @default(cuid())
  email                  String      @unique
  password_hash          String
  role                   UserRole
  is_active              Boolean     @default(true)
  must_change_password   Boolean     @default(false)
  refresh_token_hash     String?
  reset_token_hash       String?
  reset_token_expires_at DateTime?
  created_at             DateTime    @default(now())
  updated_at             DateTime    @updatedAt
  student                Student?
  audit_logs             AuditLog[]
  import_batches         StudentImportBatch[] @relation("ImportActor")
}

model StudentImportBatch {
  id              String             @id @default(cuid())
  uploaded_by_id  String
  original_name   String
  total_rows      Int
  created_count   Int                @default(0)
  updated_count   Int                @default(0)
  skipped_count   Int                @default(0)
  failed_count    Int                @default(0)
  created_at      DateTime           @default(now())
  uploaded_by     User               @relation("ImportActor", fields: [uploaded_by_id], references: [id])
  rows            StudentImportRow[]
}

model StudentImportRow {
  id               String          @id @default(cuid())
  batch_id         String
  row_number       Int
  prn              String?
  college_email    String?
  status           ImportStatus
  message          String?
  created_at       DateTime        @default(now())
  batch            StudentImportBatch @relation(fields: [batch_id], references: [id], onDelete: Cascade)
}
```

### Optional Nullability Changes

If the requirement is strict "when no Excel value exists, store `null`", then these current fields should become nullable because today they default to `0` or `false`:

- `dead_atkt_count`
- `live_atkt_count`
- `year_drop`
- `consent_declaration`

If you want to keep current analytics simple, leave these as-is and only store `null` for fields that are already nullable.

## PostgreSQL Queries

Use these SQL changes if you want raw DB queries.

```sql
ALTER TABLE "User"
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT FALSE;
```

```sql
CREATE TYPE "ImportStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');
```

```sql
CREATE TABLE "StudentImportBatch" (
  "id" TEXT PRIMARY KEY,
  "uploaded_by_id" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "total_rows" INTEGER NOT NULL,
  "created_count" INTEGER NOT NULL DEFAULT 0,
  "updated_count" INTEGER NOT NULL DEFAULT 0,
  "skipped_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentImportBatch_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);
```

```sql
CREATE TABLE "StudentImportRow" (
  "id" TEXT PRIMARY KEY,
  "batch_id" TEXT NOT NULL,
  "row_number" INTEGER NOT NULL,
  "prn" TEXT,
  "college_email" TEXT,
  "status" "ImportStatus" NOT NULL,
  "message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentImportRow_batch_id_fkey"
    FOREIGN KEY ("batch_id") REFERENCES "StudentImportBatch"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
```

```sql
CREATE INDEX "StudentImportBatch_uploaded_by_id_idx"
ON "StudentImportBatch" ("uploaded_by_id");
```

```sql
CREATE INDEX "StudentImportRow_batch_id_idx"
ON "StudentImportRow" ("batch_id");
```

Optional strict-null storage:

```sql
ALTER TABLE "Student" ALTER COLUMN "dead_atkt_count" DROP NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "dead_atkt_count" DROP DEFAULT;
ALTER TABLE "Student" ALTER COLUMN "live_atkt_count" DROP NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "live_atkt_count" DROP DEFAULT;
ALTER TABLE "Student" ALTER COLUMN "year_drop" DROP NOT NULL;
ALTER TABLE "Student" ALTER COLUMN "year_drop" DROP DEFAULT;
```

## Backend Query Logic

### Student Domain Validation

```js
const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

const isKbtcoeEmail = (email) => normalizeEmail(email).endsWith("@kbtcoe.org");
```

### Student Signup Rule

Recommended rule:

- allow signup only for `@kbtcoe.org`
- only create role `STUDENT`
- hash password before saving
- if a student record already exists for that email, link or update it instead of creating duplicate data

Example service flow:

```js
const signupStudent = async ({ email, password, name, prn, college_id, department }) => {
  const normalizedEmail = normalizeEmail(email);

  if (!isKbtcoeEmail(normalizedEmail)) {
    throw createError(400, "Only @kbtcoe.org email addresses are allowed");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { student: true }
  });

  if (existingUser) {
    throw createError(409, "Student account already exists");
  }

  const password_hash = await hashPassword(password);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: normalizedEmail,
        password_hash,
        role: "STUDENT",
        is_active: true
      }
    });

    const student = await tx.student.create({
      data: {
        user_id: user.id,
        name: name ?? null,
        prn: prn ?? null,
        college_id: college_id ?? null,
        department: department ?? null,
        college_email: normalizedEmail
      }
    });

    return { user, student };
  });
};
```

### Better Import Rule

Current code skips duplicate PRNs. Recommended new rule:

- identify student by `prn` first
- else identify by `college_email`
- if found, update the student record
- if not found, create new `User` + `Student`
- always keep `User.email` and `Student.college_email` aligned
- save import result row by row

Recommended transaction logic:

```js
const existingStudent = await prisma.student.findFirst({
  where: {
    OR: [
      mapped.prn ? { prn: mapped.prn } : undefined,
      mapped.college_email ? { college_email: mapped.college_email } : undefined
    ].filter(Boolean)
  },
  include: { user: true }
});

if (existingStudent) {
  await tx.user.update({
    where: { id: existingStudent.user_id },
    data: { email: mapped.college_email }
  });

  await tx.student.update({
    where: { id: existingStudent.id },
    data: sanitizedMappedData
  });
} else {
  const user = await tx.user.create({
    data: {
      email: mapped.college_email,
      password_hash,
      role: "STUDENT",
      is_active: true,
      must_change_password: true
    }
  });

  await tx.student.create({
    data: {
      ...sanitizedMappedData,
      user_id: user.id
    }
  });
}
```

## API Changes

Recommended endpoints:

- `POST /api/auth/student-signup`
- `POST /api/auth/login`
- `POST /api/auth/change-password`
- `POST /api/students/bulk-import`
- `GET /api/students/import-template`
- `GET /api/reports/dashboard`
- `GET /api/reports/departments`

### Student Signup Request

```json
{
  "email": "student@kbtcoe.org",
  "password": "StrongPassword123",
  "name": "Student Name",
  "prn": "72001869L",
  "college_id": "KBTUG19338",
  "department": "COMP"
}
```

### Student Login Request

```json
{
  "email": "student@kbtcoe.org",
  "password": "StrongPassword123"
}
```

### Bulk Import Response

```json
{
  "batchId": "clx123",
  "imported": 50,
  "updated": 12,
  "skipped": 3,
  "failed": 2,
  "errors": [
    {
      "row": 14,
      "prn": "72001869L",
      "reason": "Invalid department value"
    }
  ]
}
```

## Excel Import Rules

Recommended Excel behavior:

- first row is header row
- use existing header mapping from `students.service.js`
- trim all string values
- convert empty string to `null`
- parse dates safely
- parse numbers safely
- reject rows without `college_email`
- reject rows whose `college_email` is not `@kbtcoe.org`
- reject rows without both `prn` and `college_id` if identity is required
- log every success, update, skip, and failure in import history

Important note for this repository:

Current import logic sets some defaults like current year or `0`.
If you want true null-based storage, update `mapImportRow()` and any schema defaults that conflict with that behavior.

## Dashboard Impact

Admin dashboard already reads from the same `Student` and `DriveApplication` tables, so after successful import:

- total student count updates automatically
- profile completeness updates automatically
- department-wise placement numbers update automatically
- drive eligibility logic can be recalculated after import

After each create or update from import, continue calling:

```js
runEligibilityForStudent(studentId)
```

This already exists in the project and keeps drive analytics aligned.

## Full Prompt For Implementation

Use this exact prompt with a coding model if you want the feature implemented cleanly in this repository:

```text
Project: KBTCOE Placement Tracker
Stack:
- Backend: Node.js, Express, Prisma, PostgreSQL
- Frontend: React, Vite, Tailwind

Existing code locations:
- backend/prisma/schema.prisma
- backend/src/modules/auth/*
- backend/src/modules/students/*
- backend/src/modules/reports/*
- backend/src/utils/normalize.js
- frontend/src/pages/students/StudentsListPage.jsx
- frontend/src/pages/auth/LoginPage.jsx
- frontend/src/routes/AppRoutes.jsx

Goal:
Implement a complete student Excel import and student authentication flow for the placement portal.

Requirements:
1. Admin/TPO uploads an Excel file containing student data.
2. The system must parse the Excel file and store all student data in the database.
3. If a cell is empty, save null wherever the schema allows null values.
4. If the student already exists, update the existing record instead of always skipping duplicates.
5. Create linked backend User and Student records transactionally.
6. Student accounts must use role STUDENT only.
7. Student email must be restricted to the @kbtcoe.org domain.
8. Add student signup and signin support with password hashing.
9. If admin import is the source of truth, prevent duplicate fake signup accounts.
10. Add import batch history tables so admin can see import summaries and failures later.
11. Re-run student eligibility after every imported create or update.
12. Imported data must automatically appear on the admin dashboard and reports.
13. Keep existing admin/faculty auth working.
14. Add proper validation errors for invalid domain, missing required identifiers, invalid department/category values, and duplicate conflicts.

Implementation details:
- Extend Prisma schema with:
  - User.must_change_password Boolean default false
  - StudentImportBatch
  - StudentImportRow
  - ImportStatus enum
- Update bulk import logic in backend/src/modules/students/students.service.js
  - normalize headers
  - convert blank strings to null
  - validate @kbtcoe.org college email
  - use upsert-style logic by PRN or college_email
  - create or update user/student in a transaction
  - store per-row import result entries
- Add POST /api/auth/student-signup
  - only allow @kbtcoe.org
  - hash password
  - create STUDENT user
  - avoid duplicates when an imported account already exists
- Update login logic so student login respects allowed domain rules
- Add GET /api/students/import-template if needed for admins to download a correct Excel template
- Keep existing reports working and ensure imported records affect dashboard stats
- Add frontend signup page only for students if product wants self-signup
- If admin import is preferred, keep signup limited and direct students to sign in with imported accounts plus change password

Acceptance criteria:
- Admin can upload Excel and see created, updated, skipped, and failed row counts
- Empty optional values are stored as null
- Student records appear in dashboard and reports
- Only @kbtcoe.org student emails can sign up or sign in as student users
- Passwords are stored only as bcrypt hashes
- No duplicate student records are created for the same PRN or college email
- Existing admin and coordinator flows continue to work

Please implement the backend first, then wire the frontend where needed, and add concise comments only where logic is non-obvious.
```

## Best Signin/Signup Recommendation

For this project, the cleanest real-world flow is:

- Admin imports official student records first
- Student signs in with `college_email`
- Default password is generated or manually assigned
- Student changes password after first login

This is safer than unrestricted public signup.

If you still want student signup, allow it only when:

- email ends with `@kbtcoe.org`
- the email is not already linked to another user
- or the signup is treated as activation of an imported placeholder student record

## Exact Files Likely To Change

- `backend/prisma/schema.prisma`
- `backend/src/modules/auth/auth.routes.js`
- `backend/src/modules/auth/auth.controller.js`
- `backend/src/modules/auth/auth.service.js`
- `backend/src/modules/students/students.service.js`
- `backend/src/modules/students/students.controller.js`
- `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/pages/auth/LoginPage.jsx`
- `frontend/src/pages/auth/SignUpPage.jsx` if added
- `frontend/src/context/AuthContext.jsx`

