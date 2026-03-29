# Vercel Deployment Guide - Complete Setup (Personal Use)

## 🚀 Quick Overview

Deploy your Splitwise app to **Vercel** in 30 minutes for **free** or **very cheap**.

```
Web App:    vercel.com (Serverless Next.js)
Database:   Neon.tech (Serverless PostgreSQL, free tier)
Auth:       NextAuth.js (built-in Vercel support)
Mobile:     Points to deployed backend
Cost:       ~$0-10/month
```

---

## 📋 Prerequisites

1. **GitHub Account** (for Vercel integration)
2. **Vercel Account** (free tier, no credit card needed)
3. **Neon Account** (free PostgreSQL database)
4. **Domain** (optional, use free Vercel domain)

---

## Step 1: Prepare GitHub Repository

### 1.1 Initialize Git
```bash
cd /Users/rahulkushwaha/Developer/splitwise
git init
git add .
git commit -m "Initial commit: Splitwise MVP"
```

### 1.2 Create GitHub Repository
```bash
# Create new repo on GitHub
# Then:
git remote add origin https://github.com/YOUR_USERNAME/splitwise.git
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Neon Database (Free PostgreSQL)

### 2.1 Create Neon Account
1. Go to **neon.tech**
2. Sign up with GitHub (easiest)
3. Create new project: "splitwise"
4. Copy connection string (looks like: `postgresql://user:password@neon.tech/dbname`)

### 2.2 Update .env.local

```env
# Database
DATABASE_URL="postgresql://user:password@neon.tech/splitwise"

# NextAuth
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-secret-key"

# Auth
GOOGLE_CLIENT_ID="optional"
GOOGLE_CLIENT_SECRET="optional"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 2.3 Create .env.example (for GitHub)
```env
DATABASE_URL=your_neon_connection_string
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=generate_with_openssl_rand_-base64_32
```

---

## Step 3: Implement Phase 1 (Database + Auth)

### 3.1 Install Dependencies
```bash
cd web
npm install next-auth@beta @prisma/adapter-prisma bcryptjs nodemailer
npm install -D @types/nodemailer
```

### 3.2 Update Prisma Schema

**Update `web/prisma/schema.prisma`:**

```prisma
generator client {
  provider = "prisma-client"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id            Int       @id @default(autoincrement())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  password      String?
  image         String?
  createdAt     DateTime  @default(now())

  accounts      Account[]
  sessions      Session[]
  groups        GroupMember[]
  expenses      Expense[]

  @@index([email])
}

model Account {
  id                 String  @id @default(cuid())
  userId             Int
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?  @db.Text
  access_token       String?  @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?  @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       Int
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Group {
  id        Int     @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())

  members   GroupMember[]
  expenses  Expense[]

  @@index([id])
}

model GroupMember {
  id      Int @id @default(autoincrement())
  groupId Int
  userId  Int

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@index([groupId])
  @@index([userId])
}

model Expense {
  id        Int     @id @default(autoincrement())
  description String
  amount    Float
  paidById  Int
  groupId   Int
  createdAt DateTime @default(now())

  paidBy User @relation(fields: [paidById], references: [id])
  group  Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  splits ExpenseSplit[]

  @@index([groupId])
  @@index([paidById])
}

model ExpenseSplit {
  id        Int   @id @default(autoincrement())
  expenseId Int
  userId    Int
  amount    Float

  expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([expenseId])
  @@index([userId])
}
```

### 3.3 Push to Neon
```bash
npx prisma db push
```

### 3.4 Create Auth Configuration

**Create `web/lib/auth.ts`:**

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@prisma/adapter-prisma";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
};
```

**Create `web/lib/prisma.ts`:**

```typescript
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = prisma;
```

### 3.5 Create Auth API Route

**Create `web/app/api/auth/[...nextauth]/route.ts`:**

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### 3.6 Create Signup Endpoint

**Create `web/app/api/auth/signup/route.ts`:**

```typescript
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password || password.length < 6) {
      return NextResponse.json(
        { message: "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Email already used" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name || email.split("@")[0],
        email,
        password: hashedPassword,
      },
    });

    return NextResponse.json(
      { message: "User created", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
```

### 3.7 Protect API Routes

**Update `web/app/api/groups/route.ts`:**

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: {
          userId: parseInt(session.user.id),
        },
      },
    },
    include: {
      members: { include: { user: true } },
      expenses: true,
    },
  });

  return NextResponse.json(groups);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, memberIds } = await request.json();

  const group = await prisma.group.create({
    data: {
      name,
      members: {
        create: memberIds.map((userId: number) => ({
          userId,
        })),
      },
    },
    include: { members: { include: { user: true } } },
  });

  return NextResponse.json(group, { status: 201 });
}
```

---

## Step 4: Create Auth Pages

**Create `web/app/auth/signin/page.tsx`:**

```typescript
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SigninPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6 text-center">Splitwise</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignin} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="text-blue-600 hover:underline font-medium">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
```

**Create `web/app/auth/signup/page.tsx`:**

```typescript
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }

      router.push("/auth/signin");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="password"
            name="password"
            placeholder="Password (min 6 chars)"
            minLength={6}
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-blue-600 hover:underline font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
```

---

## Step 5: Update Layout to Protect Routes

**Update `web/app/layout.tsx`:**

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <html lang="en">
      <body className="bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-2xl font-bold text-blue-600">💰 Splitwise</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {session.user.name || session.user.email}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirect: true, redirectTo: "/auth/signin" });
                  }}
                >
                  <button
                    type="submit"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

---

## Step 6: Deploy to Vercel

### 6.1 Push to GitHub
```bash
git add .
git commit -m "Add authentication with NextAuth.js and Prisma"
git push origin main
```

### 6.2 Deploy on Vercel
1. Go to **vercel.com**
2. Click "New Project"
3. Select your GitHub repository
4. Framework: Next.js (auto-detected)
5. Click "Deploy"

### 6.3 Add Environment Variables

In Vercel dashboard:
1. Project Settings → Environment Variables
2. Add:
   ```
   DATABASE_URL = postgresql://neon...
   NEXTAUTH_URL = https://your-project.vercel.app
   NEXTAUTH_SECRET = your-secret-key
   ```

### 6.4 Redeploy
- Click "Redeploy" after adding env vars
- Wait 2-3 minutes
- Visit your deployed URL

---

## Step 7: Configure Mobile App

**Update `mobile/.env.local`:**

```env
EXPO_PUBLIC_API_URL=https://your-project.vercel.app
```

The mobile app will now connect to your deployed backend!

---

## Verification Checklist

- [ ] Vercel deployment shows "Ready"
- [ ] Can visit `https://your-project.vercel.app`
- [ ] Signup page loads
- [ ] Can create new account
- [ ] Can login
- [ ] Dashboard appears after login
- [ ] Can create groups
- [ ] Can add expenses
- [ ] Mobile app connects to backend

---

## Cost Breakdown (Monthly)

| Service | Free Tier | Price |
|---------|-----------|-------|
| Vercel | ✅ Yes | $0 |
| Neon DB | ✅ Yes (0.5 GB) | $0-5 |
| Domain | - | $10-12 |
| **Total** | | **$0-15/month** |

---

## Production Checklist

Before sharing with friends:

### Security
- [ ] HTTPS enabled (automatic on Vercel)
- [ ] NextAuth secret is strong
- [ ] Database passwords secure
- [ ] No sensitive data in logs

### Database
- [ ] Automated backups enabled (Neon has this)
- [ ] Indexes on frequently queried fields
- [ ] Connection pooling configured

### Monitoring
- [ ] Vercel Analytics enabled
- [ ] Error monitoring setup
- [ ] Database query logs checked

### Testing
- [ ] Signup & login works
- [ ] Can create groups
- [ ] Can add expenses
- [ ] Balance calculation correct
- [ ] Mobile app works

---

## Troubleshooting

### "Database connection failed"
- Check `DATABASE_URL` in Vercel env vars
- Ensure Neon IP is whitelisted (should be automatic)
- Test locally first: `npx prisma db push`

### "NEXTAUTH_SECRET not found"
- Add to Vercel environment variables
- Redeploy after adding

### "Mobile app can't connect"
- Check `EXPO_PUBLIC_API_URL` is correct
- Ensure it includes `https://`
- Test with curl: `curl https://your-project.vercel.app/api/users`

### Performance issues
- Check Vercel Analytics
- Look at database query performance in Neon
- Add caching if needed

---

## Scaling Later

If your friends list grows:

### Option 1: Free tier (up to 10 users)
- Current setup works fine

### Option 2: Small group (10-100 users)
- Upgrade Neon to paid: $15/month
- Keep Vercel free tier

### Option 3: Larger group (100+ users)
- Upgrade Vercel to Pro: $20/month
- Upgrade Neon to Standard: $50/month
- Add CDN for images: $20/month
- **Total: ~$90/month**

---

## Next Steps (After Launch)

### Week 1-2 (Live with friends)
- Gather feedback
- Fix bugs
- Optimize UX

### Month 2
- Add features:
  - Categories
  - Recurring expenses
  - Analytics
  - Notifications

### Month 3
- Mobile app refinements
- More monetization options
- Consider app store release

---

## Commands Reference

```bash
# Local development
npm run dev

# Prisma commands
npx prisma db push          # Sync schema with DB
npx prisma studio          # Visual DB editor
npx prisma migrate dev      # Create migration

# Deployment
git push origin main        # Triggers Vercel auto-deploy

# Generate auth secret
openssl rand -base64 32
```

---

## Vercel-Specific Tips

1. **Auto-deploy on push:** Every time you push to main, Vercel auto-deploys
2. **Preview deployments:** Every PR gets a preview URL
3. **Rollback:** Click "Previous Deployments" to rollback instantly
4. **Logs:** Click "Logs" to see server errors in real-time
5. **Analytics:** View traffic, performance, errors

---

## Success Criteria

✅ You have a production Splitwise app when:
1. Accessible at `https://your-project.vercel.app`
2. Friends can sign up with email
3. Can create groups and add expenses
4. Balances calculate correctly
5. Mobile app can connect and work
6. No errors in logs

**Estimated time to completion: 2-3 hours**

Enjoy your personal Splitwise app! 🚀
