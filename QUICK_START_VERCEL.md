# ⚡ Quick Start - Deploy to Vercel (30 Minutes)

## What You'll Get
✅ Working Splitwise app at `https://your-app.vercel.app`
✅ User authentication
✅ Real database
✅ Mobile & web access
✅ Free or $5-10/month

---

## 5-Minute Setup

### Step 1: Clone & Setup (5 min)
```bash
cd /Users/rahulkushwaha/Developer/splitwise

# Initialize Git
git init
git add .
git commit -m "Initial Splitwise MVP"

# Create GitHub repo (go to github.com, create new repo)
# Then:
git remote add origin https://github.com/YOUR_USERNAME/splitwise.git
git branch -M main
git push -u origin main
```

### Step 2: Database Setup (5 min)

**Go to neon.tech:**
1. Sign up with GitHub
2. Create project "splitwise"
3. Copy connection string
4. Save it somewhere safe

### Step 3: Vercel Setup (5 min)

**Go to vercel.com:**
1. Sign up with GitHub
2. Click "New Project"
3. Select "splitwise" repo
4. Framework: Next.js (auto)
5. Click "Deploy"

**Add Environment Variables:**
1. Project Settings → Environment Variables
2. Add:
```
DATABASE_URL = (copy from Neon)
NEXTAUTH_URL = https://your-project.vercel.app
NEXTAUTH_SECRET = (generate: openssl rand -base64 32)
```

**Click Redeploy** → Done! 🎉

---

## Implementation Steps (If Starting Fresh)

### Must Do These:

#### 1. Install Dependencies
```bash
cd web
npm install next-auth@beta @prisma/adapter-prisma bcryptjs
```

#### 2. Update Prisma Schema
Replace `web/prisma/schema.prisma` with:
[See VERCEL_DEPLOYMENT_GUIDE.md for full schema]

#### 3. Create Auth Files
Copy all files from VERCEL_DEPLOYMENT_GUIDE.md:
- `lib/auth.ts`
- `lib/prisma.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/signup/route.ts`
- `app/auth/signin/page.tsx`
- `app/auth/signup/page.tsx`

#### 4. Update Routes
Protect your API with session checks (see guide)

#### 5. Deploy
```bash
git add .
git commit -m "Add NextAuth authentication"
git push origin main
```

---

## Common Issues & Fixes

### Database Connection Failed
```bash
# Test locally first
npx prisma db push
```

### NEXTAUTH_SECRET Error
```bash
# Generate new secret
openssl rand -base64 32
```

### Mobile App Can't Connect
Update `mobile/.env.local`:
```
EXPO_PUBLIC_API_URL=https://your-deployed-url.vercel.app
```

---

## Test Your Deployment

1. Visit `https://your-project.vercel.app`
2. Should see login page
3. Click "Sign Up"
4. Create test account
5. Should see dashboard
6. Try creating a group
7. Add some expenses
8. Check balances

✅ All working? You're done!

---

## Share with Friends

Send them: `https://your-project.vercel.app`

They can:
1. Sign up
2. Ask you to add them to groups
3. Start tracking shared expenses

---

## Free for First 2 Months

- **Vercel:** Free forever (unless massive traffic)
- **Neon:** Free 0.5GB (perfect for friends group)
- **Domain:** Free .vercel.app subdomain

After that: ~$5-10/month if you want upgrades

---

## Full Detailed Guide

See `VERCEL_DEPLOYMENT_GUIDE.md` for:
- Complete code samples
- Detailed explanations
- Troubleshooting
- Scaling options
- Cost breakdown

**Estimated Time: 30 minutes to live app**

---

## Summary

1. GitHub repo ✅
2. Neon database ✅
3. Vercel deployment ✅
4. Auth implemented ✅
5. Share with friends ✅

You're good to go! 🚀
