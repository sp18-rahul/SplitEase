# Splitwise Clone - Practical Implementation Guide

**A step-by-step guide to build each component**

---

## PART 1: Backend Setup

### Step 1: Initialize Node.js Project with TypeScript

```bash
# Create project
mkdir splitwise-api && cd splitwise-api
npm init -y

# Install dependencies
npm install express typescript ts-node @types/express @types/node
npm install pg knex dotenv joi bcryptjs jsonwebtoken
npm install redis ioredis
npm install kafka-node bull  # For async jobs
npm install cors helmet express-rate-limit
npm install uuid decimal.js

# Dev dependencies
npm install -D @types/jest jest ts-jest prettier eslint
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Initialize TypeScript
npx tsc --init
```

### Step 2: Project Structure

```bash
src/
├── config/
│   ├── database.ts        # PostgreSQL connection
│   ├── redis.ts           # Redis connection
│   ├── env.ts             # Environment variables
│   └── constants.ts
├── middleware/
│   ├── auth.ts            # JWT verification
│   ├── validation.ts      # Input validation
│   ├── errorHandler.ts    # Error handling
│   └── logger.ts
├── services/
│   ├── expense.ts
│   ├── balance.ts         # Balance calculation
│   ├── settlement.ts
│   ├── group.ts
│   ├── user.ts
│   └── notification.ts
├── repositories/
│   ├── expenseRepo.ts
│   ├── userRepo.ts
│   ├── groupRepo.ts
│   └── balanceRepo.ts
├── controllers/
│   ├── expenseController.ts
│   ├── groupController.ts
│   ├── settlementController.ts
│   └── authController.ts
├── routes/
│   ├── expenses.ts
│   ├── groups.ts
│   ├── settlements.ts
│   ├── auth.ts
│   └── index.ts
├── utils/
│   ├── validators.ts
│   ├── formatters.ts
│   ├── cache.ts
│   └── decimals.ts
├── jobs/
│   ├── notificationJob.ts
│   └── reportingJob.ts
├── types/
│   └── index.ts
└── app.ts               # Express app setup
```

### Step 3: Environment Configuration

```bash
# .env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/splitwise
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_POOL_SIZE=10

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRY=900              # 15 minutes
JWT_REFRESH_EXPIRY=604800   # 7 days

# API
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

# Email/Notifications
NOTIFICATION_SERVICE_URL=https://api.sendgrid.com
SENDGRID_API_KEY=xxx

# AWS/Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET=splitwise-uploads
```

---

## PART 2: Database Implementation

### Step 1: Knex Setup (Migration Tool)

```bash
npm install knex pg
npx knex init
```

### Step 2: Create Migrations

```typescript
// migrations/001_create_users.ts

import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("email", 255).unique().notNullable();
    table.string("password_hash", 255).notNullable();
    table.string("first_name", 100);
    table.string("last_name", 100);
    table.string("phone", 20);
    table.string("profile_image_url");
    table.string("currency", 3).defaultTo("USD");
    table.string("language", 5).defaultTo("en");
    table.string("timezone", 50).defaultTo("UTC");
    table.boolean("mfa_enabled").defaultTo(false);
    table.string("mfa_secret");
    table.enum("status", ["active", "inactive", "suspended"]).defaultTo("active");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();

    table.index("email");
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("users");
}
```

```typescript
// migrations/002_create_groups.ts

import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .createTable("groups", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.string("name", 255).notNullable();
      table.text("description");
      table.string("image_url");
      table.string("currency", 3).defaultTo("USD");
      table.uuid("created_by").notNullable().references("id").inTable("users");
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table.timestamp("deleted_at").nullable();
      table.boolean("is_active").defaultTo(true);
    })
    .createTable("group_members", (table) => {
      table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
      table.uuid("group_id").notNullable().references("id").inTable("groups").onDelete("CASCADE");
      table.uuid("user_id").notNullable().references("id").inTable("users").onDelete("CASCADE");
      table.enum("role", ["owner", "admin", "member"]).defaultTo("member");
      table.timestamp("joined_at").defaultTo(knex.fn.now());
      table.boolean("is_active").defaultTo(true);

      table.unique(["group_id", "user_id"]);
    });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable("group_members").dropTable("groups");
}
```

```bash
# Run migrations
npx knex migrate:latest
```

### Step 3: Create Knex Instance

```typescript
// src/config/database.ts

import knex from 'knex';
import { config } from 'dotenv';

config();

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: {
    min: parseInt(process.env.DATABASE_POOL_MIN || '5'),
    max: parseInt(process.env.DATABASE_POOL_MAX || '20')
  },
  migrations: {
    directory: './migrations'
  }
});

export default db;
```

---

## PART 3: Core Balance Calculation Service

### Complete Implementation

```typescript
// src/services/balance.ts

import Decimal from 'decimal.js';
import db from '../config/database';
import { Transaction, Balance } from '../types';

export class BalanceService {

  /**
   * Calculate all balances for a group
   */
  async calculateGroupBalances(groupId: string): Promise<Map<string, Decimal>> {
    const expenses = await db('expenses')
      .select('*')
      .where({ group_id: groupId, is_deleted: false });

    const balances = new Map<string, Decimal>();

    // For each expense, add to payer and subtract from participants
    for (const expense of expenses) {
      const paidAmount = new Decimal(expense.amount);

      // Add to payer
      balances.set(
        expense.paid_by_user_id,
        (balances.get(expense.paid_by_user_id) || new Decimal(0)).plus(paidAmount)
      );

      // Get splits for this expense
      const splits = await db('expense_splits')
        .select('*')
        .where({ expense_id: expense.id });

      // Subtract from each participant
      for (const split of splits) {
        const splitAmount = new Decimal(split.amount);
        balances.set(
          split.user_id,
          (balances.get(split.user_id) || new Decimal(0)).minus(splitAmount)
        );
      }
    }

    return balances;
  }

  /**
   * Get pairwise balances (who owes whom)
   */
  async getPairwiseBalances(groupId: string): Promise<Transaction[]> {
    const balances = await this.calculateGroupBalances(groupId);
    return this.minimizeTransactions(balances);
  }

  /**
   * Minimize transactions using greedy algorithm
   */
  private minimizeTransactions(balances: Map<string, Decimal>): Transaction[] {
    // Separate into debtors and creditors
    const debtors: Array<{ userId: string; amount: Decimal }> = [];
    const creditors: Array<{ userId: string; amount: Decimal }> = [];

    for (const [userId, balance] of balances) {
      if (balance.isNegative()) {
        debtors.push({ userId, amount: balance.abs() });
      } else if (balance.isPositive()) {
        creditors.push({ userId, amount: balance });
      }
    }

    // Sort for consistent ordering
    debtors.sort((a, b) => b.amount.comparedTo(a.amount));
    creditors.sort((a, b) => b.amount.comparedTo(a.amount));

    const transactions: Transaction[] = [];
    let debtorIdx = 0, creditorIdx = 0;

    // Greedy matching
    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx];
      const creditor = creditors[creditorIdx];

      const amount = Decimal.min(debtor.amount, creditor.amount);

      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: amount.toNumber()
      });

      debtor.amount = debtor.amount.minus(amount);
      creditor.amount = creditor.amount.minus(amount);

      if (debtor.amount.isZero()) debtorIdx++;
      if (creditor.amount.isZero()) creditorIdx++;
    }

    return transactions;
  }

  /**
   * Validate balance calculation
   */
  validateBalances(balances: Map<string, Decimal>): boolean {
    let total = new Decimal(0);
    for (const balance of balances.values()) {
      total = total.plus(balance);
    }

    // Total should be zero (money conserved)
    return total.abs().lessThan(0.01);
  }

  /**
   * Update cached balances in database
   */
  async updateBalanceCache(groupId: string): Promise<void> {
    const balances = await this.calculateGroupBalances(groupId);

    // Clear existing cache
    await db('user_balances').where({ group_id: groupId }).del();

    // Insert new cache
    for (const [userId, netBalance] of balances) {
      await db('user_balances').insert({
        group_id: groupId,
        user_id: userId,
        total_paid: new Decimal(0),  // Would be calculated separately
        total_owed: new Decimal(0),
        net_balance: netBalance.toFixed(2),
        last_calculated_at: new Date()
      });
    }
  }

  /**
   * Get user's balance in a specific group
   */
  async getUserGroupBalance(userId: string, groupId: string): Promise<Decimal> {
    const balances = await this.calculateGroupBalances(groupId);
    return balances.get(userId) || new Decimal(0);
  }

  /**
   * Handle concurrent balance updates with locking
   */
  async updateBalancesWithLock(groupId: string): Promise<void> {
    await db.transaction(async (trx) => {
      // Lock the group
      const group = await trx('groups')
        .where({ id: groupId })
        .forUpdate()
        .first();

      if (!group) throw new Error('Group not found');

      // Recalculate balances
      const balances = await this.calculateGroupBalances(groupId);

      // Update in transaction
      await trx('user_balances')
        .where({ group_id: groupId })
        .del();

      for (const [userId, netBalance] of balances) {
        await trx('user_balances').insert({
          group_id: groupId,
          user_id: userId,
          net_balance: netBalance.toFixed(2),
          last_calculated_at: new Date()
        });
      }
    });
  }
}
```

---

## PART 4: API Controllers & Routes

### User Authentication

```typescript
// src/controllers/auth.ts

import express from 'express';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { validateEmail, validatePassword } from '../utils/validators';

export class AuthController {

  static async signup(req: express.Request, res: express.Response) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate input
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email' });
      }

      if (!validatePassword(password)) {
        return res.status(400).json({
          error: 'Password must be 8+ chars with uppercase, lowercase, and number'
        });
      }

      // Check if user exists
      const existing = await db('users').where({ email }).first();
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await bcryptjs.hash(password, 12);

      // Create user
      const [user] = await db('users')
        .insert({
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName
        })
        .returning('*');

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      // Store refresh token in Redis
      await redis.set(
        `refresh:${user.id}:${refreshToken}`,
        JSON.stringify({ userId: user.id }),
        'EX',
        7 * 24 * 60 * 60
      );

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name
        },
        accessToken,
        refreshToken
      });

    } catch (error) {
      console.error('Signup error:', error);
      return res.status(500).json({ error: 'Signup failed' });
    }
  }

  static async login(req: express.Request, res: express.Response) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await db('users').where({ email }).first();
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const valid = await bcryptjs.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate tokens
      const accessToken = this.generateAccessToken(user.id);
      const refreshToken = this.generateRefreshToken(user.id);

      return res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name
        },
        accessToken,
        refreshToken
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  static async refresh(req: express.Request, res: express.Response) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET!
      ) as { userId: string };

      // Check if refresh token exists in Redis
      const stored = await redis.get(`refresh:${payload.userId}:${refreshToken}`);
      if (!stored) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(payload.userId);

      return res.json({ accessToken });

    } catch (error) {
      return res.status(401).json({ error: 'Token refresh failed' });
    }
  }

  private static generateAccessToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: parseInt(process.env.JWT_EXPIRY || '900') }
    );
  }

  private static generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRY || '604800') }
    );
  }
}
```

### Expense Controller

```typescript
// src/controllers/expense.ts

import express from 'express';
import Decimal from 'decimal.js';
import db from '../config/database';
import { BalanceService } from '../services/balance';
import redis from '../config/redis';

export class ExpenseController {

  static async addExpense(req: express.Request, res: express.Response) {
    try {
      const groupId = req.params.groupId;
      const userId = req.user!.id;
      const {
        description,
        amount,
        splits,  // [{ userId, amount }]
        category,
        date
      } = req.body;

      // Validate user is member of group
      const member = await db('group_members')
        .where({ group_id: groupId, user_id: userId })
        .first();

      if (!member) {
        return res.status(403).json({ error: 'Not a group member' });
      }

      // Atomic transaction
      await db.transaction(async (trx) => {
        // Lock group
        await trx('groups')
          .where({ id: groupId })
          .forUpdate()
          .first();

        // Create expense
        const [expense] = await trx('expenses')
          .insert({
            group_id: groupId,
            description,
            amount: new Decimal(amount).toFixed(2),
            paid_by_user_id: userId,
            category,
            date
          })
          .returning('*');

        // Create splits
        for (const split of splits) {
          await trx('expense_splits').insert({
            expense_id: expense.id,
            user_id: split.userId,
            amount: new Decimal(split.amount).toFixed(2)
          });
        }

        // Update balance cache
        const balanceService = new BalanceService();
        await balanceService.updateBalanceCache(groupId);

        // Create activity log
        await trx('activity_logs').insert({
          user_id: userId,
          group_id: groupId,
          action: 'expense_created',
          entity_type: 'expense',
          entity_id: expense.id,
          details: { amount, splits }
        });
      });

      // Invalidate cache
      await redis.del(`balance:${groupId}:*`);

      // Emit real-time update
      io.to(`group:${groupId}`).emit('expense_added', {
        groupId,
        amount,
        splits
      });

      return res.status(201).json({ success: true });

    } catch (error) {
      console.error('Expense error:', error);
      return res.status(500).json({ error: 'Failed to add expense' });
    }
  }

  static async getGroupExpenses(req: express.Request, res: express.Response) {
    try {
      const groupId = req.params.groupId;

      const expenses = await db('expenses')
        .select('*')
        .where({
          group_id: groupId,
          is_deleted: false
        })
        .orderBy('date', 'desc');

      // Get splits for each expense
      for (const expense of expenses) {
        expense.splits = await db('expense_splits')
          .select('*')
          .where({ expense_id: expense.id });
      }

      return res.json({ expenses });

    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  }
}
```

### Routes Setup

```typescript
// src/routes/index.ts

import express from 'express';
import authRoutes from './auth';
import groupRoutes from './groups';
import expenseRoutes from './expenses';
import settlementRoutes from './settlements';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes (require authentication)
router.use('/groups', authenticateToken, groupRoutes);
router.use('/expenses', authenticateToken, expenseRoutes);
router.use('/settlements', authenticateToken, settlementRoutes);

export default router;
```

```typescript
// src/routes/expenses.ts

import express from 'express';
import { ExpenseController } from '../controllers/expense';

const router = express.Router();

router.post('/:groupId/add', ExpenseController.addExpense);
router.get('/:groupId', ExpenseController.getGroupExpenses);
router.put('/:id', ExpenseController.updateExpense);
router.delete('/:id', ExpenseController.deleteExpense);

export default router;
```

---

## PART 5: Frontend (React) Implementation

### Project Setup

```bash
# Create React project with Vite
npm create vite@latest splitwise-web -- --template react-ts
cd splitwise-web

npm install axios react-redux @reduxjs/toolkit react-hook-form
npm install zod react-router-dom
npm install tailwindcss shadcn/ui
npm install zustand  # Alternative to Redux
```

### Redux Store Structure

```typescript
// src/store/slices/authSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

interface AuthState {
  user: { id: string; email: string; name: string } | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  loading: false,
  error: null
};

export const signup = createAsyncThunk(
  'auth/signup',
  async ({ email, password, firstName }: {
    email: string;
    password: string;
    firstName: string;
  }, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/v1/auth/signup', {
        email,
        password,
        firstName
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error);
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        localStorage.setItem('accessToken', action.payload.accessToken);
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export default authSlice.reducer;
```

### Main App Component

```typescript
// src/App.tsx

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import GroupDetail from './pages/groups/GroupDetail';
import AddExpense from './pages/expenses/AddExpense';

import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';

function App() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token && !user) {
      // Verify token and fetch user
      dispatch(verifyToken());
    }
  }, [dispatch, user]);

  return (
    <Router>
      {user && <Navigation />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <ProtectedRoute>
              <GroupDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId/expenses/add"
          element={
            <ProtectedRoute>
              <AddExpense />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
```

### Expense Form Component

```typescript
// src/components/expenses/ExpenseForm.tsx

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';

const expenseSchema = z.object({
  description: z.string().min(1, 'Description required'),
  amount: z.string().refine((val) => parseFloat(val) > 0, 'Amount must be > 0'),
  splitType: z.enum(['equal', 'exact', 'percentage']),
  splits: z.array(z.object({
    userId: z.string(),
    amount: z.string()
  })),
  category: z.string().default('general'),
  date: z.string()
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  groupId: string;
  groupMembers: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export default function ExpenseForm({
  groupId,
  groupMembers,
  onSuccess
}: ExpenseFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      splitType: 'equal',
      date: new Date().toISOString().split('T')[0]
    }
  });

  const amount = watch('amount');
  const splitType = watch('splitType');
  const splits = watch('splits') || [];

  // Auto-calculate equal splits
  React.useEffect(() => {
    if (splitType === 'equal' && amount && groupMembers.length > 0) {
      const perPerson = (parseFloat(amount) / groupMembers.length).toFixed(2);
      const newSplits = groupMembers.map(member => ({
        userId: member.id,
        amount: perPerson
      }));
      setValue('splits', newSplits);
    }
  }, [amount, splitType, groupMembers, setValue]);

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      await axios.post(`/api/v1/expenses/${groupId}/add`, {
        ...data,
        groupId
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        }
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Description */}
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <div>
            <label>Description</label>
            <input
              {...field}
              type="text"
              placeholder="Dinner, Rent, etc."
              className="w-full px-4 py-2 border rounded"
            />
            {errors.description && (
              <p className="text-red-500">{errors.description.message}</p>
            )}
          </div>
        )}
      />

      {/* Amount */}
      <Controller
        name="amount"
        control={control}
        render={({ field }) => (
          <div>
            <label>Amount</label>
            <input
              {...field}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-2 border rounded"
            />
            {errors.amount && (
              <p className="text-red-500">{errors.amount.message}</p>
            )}
          </div>
        )}
      />

      {/* Split Type */}
      <Controller
        name="splitType"
        control={control}
        render={({ field }) => (
          <div>
            <label>Split Type</label>
            <select {...field} className="w-full px-4 py-2 border rounded">
              <option value="equal">Equal</option>
              <option value="exact">Exact Amounts</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
        )}
      />

      {/* Splits */}
      <div>
        <label>Who gets split?</label>
        {groupMembers.map((member, idx) => (
          <div key={member.id} className="flex items-center gap-4 mb-2">
            <span>{member.name}</span>
            <Controller
              name={`splits.${idx}.amount`}
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="number"
                  step="0.01"
                  className="w-24 px-2 py-1 border rounded"
                />
              )}
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Add Expense
      </button>
    </form>
  );
}
```

---

## PART 6: Testing Strategy

### Backend Testing

```typescript
// src/__tests__/balance.test.ts

import { BalanceService } from '../services/balance';
import db from '../config/database';
import Decimal from 'decimal.js';

describe('BalanceService', () => {
  let balanceService: BalanceService;

  beforeEach(() => {
    balanceService = new BalanceService();
  });

  test('should calculate equal splits correctly', async () => {
    // Setup: Create test data
    const groupId = 'test-group-1';
    const userId1 = 'user-1';
    const userId2 = 'user-2';
    const userId3 = 'user-3';

    // Insert expense: user1 paid $30, split equally among 3
    await db('expenses').insert({
      id: 'expense-1',
      group_id: groupId,
      description: 'Dinner',
      amount: '30.00',
      paid_by_user_id: userId1,
      date: new Date(),
      split_type: 'equal'
    });

    // Insert splits
    await db('expense_splits').insert([
      { expense_id: 'expense-1', user_id: userId1, amount: '10.00' },
      { expense_id: 'expense-1', user_id: userId2, amount: '10.00' },
      { expense_id: 'expense-1', user_id: userId3, amount: '10.00' }
    ]);

    // Calculate balances
    const balances = await balanceService.calculateGroupBalances(groupId);

    // Expectations
    expect(balances.get(userId1)?.toFixed(2)).toBe('20.00');  // Paid 30, owes 10
    expect(balances.get(userId2)?.toFixed(2)).toBe('-10.00'); // Owes 10
    expect(balances.get(userId3)?.toFixed(2)).toBe('-10.00'); // Owes 10
  });

  test('should minimize transactions correctly', async () => {
    // Setup: Create complex balance scenario
    const balances = new Map([
      ['user-1', new Decimal(20)],   // User 1 is owed $20
      ['user-2', new Decimal(-10)],  // User 2 owes $10
      ['user-3', new Decimal(-10)]   // User 3 owes $10
    ]);

    const transactions = balanceService['minimizeTransactions'](balances);

    // Expectations: Should create 2 transactions
    expect(transactions.length).toBe(2);
    expect(transactions[0].amount).toBe(10);
    expect(transactions[1].amount).toBe(10);
  });

  test('should validate balance conservation', async () => {
    const balances = new Map([
      ['user-1', new Decimal(100)],
      ['user-2', new Decimal(-50)],
      ['user-3', new Decimal(-50)]
    ]);

    const isValid = balanceService['validateBalances'](balances);
    expect(isValid).toBe(true);
  });
});
```

### Frontend Testing

```typescript
// src/__tests__/components/ExpenseForm.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExpenseForm from '../../components/expenses/ExpenseForm';
import axios from 'axios';

jest.mock('axios');

describe('ExpenseForm', () => {
  const mockGroupId = 'group-1';
  const mockMembers = [
    { id: 'user-1', name: 'Alice' },
    { id: 'user-2', name: 'Bob' }
  ];

  test('should render form fields', () => {
    render(
      <ExpenseForm
        groupId={mockGroupId}
        groupMembers={mockMembers}
      />
    );

    expect(screen.getByPlaceholderText(/Description/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Amount/i)).toBeInTheDocument();
  });

  test('should calculate equal splits', async () => {
    const { container } = render(
      <ExpenseForm
        groupId={mockGroupId}
        groupMembers={mockMembers}
      />
    );

    const amountInput = screen.getByPlaceholderText(/Amount/i);
    fireEvent.change(amountInput, { target: { value: '100' } });

    await waitFor(() => {
      const splitInputs = container.querySelectorAll('input[type="number"]');
      // Each member gets $50
      expect(splitInputs[1].value).toBe('50'); // Second input is first split
    });
  });

  test('should submit form with valid data', async () => {
    const mockOnSuccess = jest.fn();
    const mockAxios = axios as jest.MockedFunction<typeof axios>;

    mockAxios.post.mockResolvedValue({ data: { success: true } });

    render(
      <ExpenseForm
        groupId={mockGroupId}
        groupMembers={mockMembers}
        onSuccess={mockOnSuccess}
      />
    );

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/Description/i), {
      target: { value: 'Dinner' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Amount/i), {
      target: { value: '100' }
    });

    // Submit
    fireEvent.click(screen.getByText(/Add Expense/i));

    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
```

---

## Quick Start Checklist

- [ ] Clone repository
- [ ] Install dependencies (npm install)
- [ ] Copy .env.example to .env
- [ ] Run database migrations (npx knex migrate:latest)
- [ ] Start PostgreSQL and Redis
- [ ] Start backend (npm run dev)
- [ ] Start frontend (npm run dev)
- [ ] Run tests (npm test)
- [ ] Access http://localhost:3001

---

**Next: Deploy to production following DEPLOYMENT.md**
