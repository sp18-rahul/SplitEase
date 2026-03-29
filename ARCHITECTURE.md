# Splitwise Clone - Production-Ready Architecture

**Last Updated**: 2026-03-23
**Status**: Architecture & Design Phase
**Target**: Enterprise-grade cost-splitting platform

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Tech Stack](#tech-stack)
3. [Backend Design](#backend-design)
4. [Database Schema](#database-schema)
5. [Balance Calculation Algorithm](#balance-calculation-algorithm)
6. [Frontend Structure](#frontend-structure)
7. [Deployment Strategy](#deployment-strategy)
8. [Security Architecture](#security-architecture)
9. [Scaling Strategy](#scaling-strategy)
10. [Advanced Features](#advanced-features)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  Web (React SPA)  │  Mobile (React Native/Flutter)  │  Admin │
└────────────┬──────────────────────────────┬──────────┬───────┘
             │                              │          │
             └──────────────┬───────────────┴──────────┘
                            │
        ┌───────────────────▼────────────────────┐
        │      API GATEWAY / LOAD BALANCER       │
        │  (Kong / AWS ALB with rate limiting)   │
        └───────────────────┬────────────────────┘
                            │
        ┌───────────────────▼────────────────────┐
        │     AUTHENTICATION SERVICE (OAuth2)    │
        │  JWT + Refresh Token + MFA Support     │
        └───────────────────┬────────────────────┘
                            │
        ┌───────────────────▼────────────────────────────────┐
        │            MICROSERVICES LAYER                     │
        ├───────────────────────────────────────────────────┤
        │                                                    │
        │  ┌──────────────┐  ┌──────────────────┐           │
        │  │ User Service │  │  Group Service   │           │
        │  └──────────────┘  └──────────────────┘           │
        │                                                    │
        │  ┌──────────────┐  ┌──────────────────┐           │
        │  │ Expense      │  │ Settlement &     │           │
        │  │ Service      │  │ Balance Service  │           │
        │  └──────────────┘  └──────────────────┘           │
        │                                                    │
        │  ┌──────────────┐  ┌──────────────────┐           │
        │  │ Notification │  │ Reporting Service│           │
        │  │ Service      │  │ (Analytics)      │           │
        │  └──────────────┘  └──────────────────┘           │
        │                                                    │
        └────────┬─────────┬─────────┬─────────┬────────────┘
                 │         │         │         │
        ┌────────▼──┐ ┌────▼──┐ ┌───▼───┐ ┌──▼────┐
        │ PostgreSQL│ │ Redis │ │ Kafka │ │ S3    │
        │  (Shared) │ │(Cache)│ │(Queue)│ │(Files)│
        └───────────┘ └───────┘ └───────┘ └───────┘
```

### Service Responsibilities

| Service | Purpose | Key Entities |
|---------|---------|--------------|
| **User Service** | User management, profiles | User, Profile, AuthToken |
| **Group Service** | Group CRUD, membership | Group, GroupMember |
| **Expense Service** | Expense management | Expense, ExpenseSplit, Receipt |
| **Settlement Service** | Balance calculation, debt tracking | Settlement, Balance, Transaction |
| **Notification Service** | Real-time & async notifications | Notification, Subscription |
| **Reporting Service** | Analytics, reports, exports | Report, Metric, Audit |

---

## Tech Stack

### Recommended Production Stack

#### Backend
```
API Framework: Node.js (Express.js) + TypeScript
  OR: Python (FastAPI/Django) for data-heavy operations
  OR: Go (Gin) for high-performance microservices

Message Queue: Apache Kafka / RabbitMQ
  - Event streaming
  - Async processing (notifications, reports)
  - Service-to-service communication

Cache Layer: Redis
  - Session storage
  - Computed balances
  - Rate limiting
  - Real-time updates via pub/sub

Database: PostgreSQL 14+
  - JSONB columns for flexibility
  - Full-text search
  - Advanced analytics
  - ACID compliance

Search/Analytics: Elasticsearch + Kibana
  - Full-text search on expenses
  - Analytics dashboards

Job Queue: Bull (Node.js) / Celery (Python)
  - Background processing
  - Scheduled tasks
```

#### Frontend

**Web:**
```
Framework: React 18 + TypeScript
State Management: Redux Toolkit / Zustand
Forms: React Hook Form + Zod validation
Styling: Tailwind CSS + Shadcn/ui components
Build Tool: Vite / Next.js
Testing: Jest + React Testing Library
```

**Mobile:**
```
Framework: React Native (Expo for MVP, bare for production)
State Management: Redux Toolkit / Zustand
Navigation: React Navigation
Payment Integration: Stripe SDK, Razorpay (India)
Platform-Specific: Native modules for UPI (India)
```

#### DevOps & Infrastructure

```
Containerization: Docker + Docker Compose
Orchestration: Kubernetes (EKS on AWS)
CI/CD: GitHub Actions / GitLab CI
Infrastructure as Code: Terraform
Monitoring: Prometheus + Grafana + ELK Stack
Logging: CloudWatch / ELK Stack
Tracing: Jaeger / AWS X-Ray
Cloud Provider: AWS (Recommended)
  - ECS/EKS for containers
  - RDS for PostgreSQL
  - ElastiCache for Redis
  - SNS/SQS for messaging
  - S3 for file storage
  - CloudFront for CDN
```

---

## Backend Design

### Layered Architecture

```
┌─────────────────────────────────┐
│    API Controllers/Routes       │  Layer 1: HTTP Interface
├─────────────────────────────────┤
│    Middleware                   │  Layer 2: Cross-cutting concerns
│    (Auth, Validation, Logging)  │
├─────────────────────────────────┤
│    Business Services            │  Layer 3: Core Logic
│    (Domain Logic)               │
├─────────────────────────────────┤
│    Data Access Layer/Repository │  Layer 4: Data Access
├─────────────────────────────────┤
│    Database + Cache             │  Layer 5: Persistence
└─────────────────────────────────┘
```

### Example Service Structure (Node.js/TypeScript)

```
src/
├── config/
│   ├── database.ts
│   ├── redis.ts
│   └── env.ts
├── middleware/
│   ├── auth.ts
│   ├── validation.ts
│   ├── errorHandler.ts
│   └── rateLimiter.ts
├── services/
│   ├── expense/
│   │   ├── ExpenseService.ts
│   │   ├── SplitCalculator.ts
│   │   └── ReceiptProcessor.ts
│   ├── settlement/
│   │   ├── BalanceCalculator.ts
│   │   ├── DebtSimplifier.ts
│   │   └── SettlementService.ts
│   ├── group/
│   │   └── GroupService.ts
│   └── notification/
│       └── NotificationService.ts
├── repositories/
│   ├── ExpenseRepository.ts
│   ├── UserRepository.ts
│   └── GroupRepository.ts
├── models/
│   ├── Expense.ts
│   ├── User.ts
│   └── Group.ts
├── routes/
│   ├── expenses.ts
│   ├── groups.ts
│   ├── settlements.ts
│   └── users.ts
├── utils/
│   ├── validators.ts
│   ├── decimals.ts (for precision)
│   └── cache.ts
├── jobs/
│   ├── notificationJobs.ts
│   └── reportingJobs.ts
└── app.ts
```

### API Endpoints (RESTful + GraphQL optional)

```
REST Endpoints:

USER MANAGEMENT
POST   /api/v1/auth/signup
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/mfa/setup
POST   /api/v1/auth/mfa/verify
GET    /api/v1/users/me
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id

GROUP MANAGEMENT
GET    /api/v1/groups
POST   /api/v1/groups
GET    /api/v1/groups/:id
PUT    /api/v1/groups/:id
DELETE /api/v1/groups/:id
POST   /api/v1/groups/:id/members
DELETE /api/v1/groups/:id/members/:memberId
GET    /api/v1/groups/:id/members

EXPENSE MANAGEMENT
GET    /api/v1/groups/:id/expenses
POST   /api/v1/groups/:id/expenses
GET    /api/v1/expenses/:id
PUT    /api/v1/expenses/:id
DELETE /api/v1/expenses/:id
POST   /api/v1/expenses/:id/upload-receipt

SETTLEMENT & BALANCE
GET    /api/v1/groups/:id/balances
GET    /api/v1/groups/:id/balances/:userId
POST   /api/v1/groups/:id/settle
GET    /api/v1/groups/:id/settlements
GET    /api/v1/users/:id/summary

ADVANCED
GET    /api/v1/groups/:id/statistics
POST   /api/v1/groups/:id/export
GET    /api/v1/notifications
POST   /api/v1/notifications/:id/read
GET    /api/v1/activities
```

---

## Database Schema

### PostgreSQL Schema with Relationships

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    profile_image_url TEXT,
    currency VARCHAR(3) DEFAULT 'USD',
    language VARCHAR(5) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    -- Indexes
    CONSTRAINT email_unique UNIQUE (email),
    CONSTRAINT valid_currency CHECK (currency ~ '^[A-Z]{3}$')
);

-- Groups Table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    currency VARCHAR(3) DEFAULT 'USD',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    -- For soft deletes
    is_active BOOLEAN DEFAULT TRUE
);

-- Group Members Table (many-to-many with metadata)
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role ENUM('owner', 'admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    -- Composite unique constraint
    UNIQUE(group_id, user_id),

    -- Foreign keys
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Expenses Table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    paid_by_user_id UUID NOT NULL REFERENCES users(id),
    category VARCHAR(50) DEFAULT 'general',
    split_type ENUM('equal', 'exact', 'percentage', 'itemized') DEFAULT 'equal',
    receipt_url TEXT,
    receipt_ocr_data JSONB,  -- OCR extracted data
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    -- Soft delete
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Indexes
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (paid_by_user_id) REFERENCES users(id),
    INDEX idx_group_date (group_id, date)
);

-- Expense Splits Table (who owes what)
CREATE TABLE expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
    percentage DECIMAL(5, 2),  -- For percentage splits
    is_itemized_split BOOLEAN DEFAULT FALSE,

    -- Ensure user participates in expense split
    UNIQUE(expense_id, user_id),

    FOREIGN KEY (expense_id) REFERENCES expenses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Itemized Splits (for detailed receipts)
CREATE TABLE itemized_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_name VARCHAR(255),
    item_amount DECIMAL(15, 2) NOT NULL,
    quantity INT DEFAULT 1,

    FOREIGN KEY (expense_id) REFERENCES expenses(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Cached Balances Table (denormalized for performance)
CREATE TABLE user_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_paid DECIMAL(15, 2) DEFAULT 0,
    total_owed DECIMAL(15, 2) DEFAULT 0,
    net_balance DECIMAL(15, 2) DEFAULT 0,  -- Positive = owed to user, Negative = owes
    last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Denormalized cache - recalculate periodically
    UNIQUE(group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Pairwise Balances (who owes whom)
CREATE TABLE pairwise_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,  -- Positive = from_user owes to_user
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure no self-relationships
    CHECK (from_user_id != to_user_id),

    -- Composite unique constraint
    UNIQUE(group_id, from_user_id, to_user_id),

    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
);

-- Settlements Table (actual payments made)
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    settlement_method ENUM('cash', 'bank', 'upi', 'paypal', 'stripe') DEFAULT 'bank',
    reference_id VARCHAR(255),  -- For tracking payment references
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,  -- expense_added, settlement_pending, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,  -- Flexible data for different notification types
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity/Audit Log
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    group_id UUID REFERENCES groups(id),
    action VARCHAR(50),  -- created_expense, settled_debt, added_member
    entity_type VARCHAR(50),  -- expense, settlement, group
    entity_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Indexes for Performance
CREATE INDEX idx_expenses_group_date ON expenses(group_id, date DESC);
CREATE INDEX idx_expense_splits_user ON expense_splits(user_id);
CREATE INDEX idx_balances_group ON user_balances(group_id);
CREATE INDEX idx_pairwise_balances_group ON pairwise_balances(group_id);
CREATE INDEX idx_settlements_status ON settlements(status);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX idx_activity_logs_group ON activity_logs(group_id, created_at DESC);
```

---

## Balance Calculation Algorithm

### Core Algorithm: Graph-Based Settlement

```typescript
// Pseudocode for balance calculation

interface Balance {
  userId: string;
  amount: number; // Positive = owed to user, Negative = owes
}

interface Transaction {
  from: string;
  to: string;
  amount: number;
}

class BalanceCalculator {

  // Step 1: Calculate individual balances
  calculateBalances(expenses: Expense[]): Map<string, number> {
    const balances = new Map<string, number>();

    for (const expense of expenses) {
      // Add to payer's balance
      balances.set(
        expense.paidBy,
        (balances.get(expense.paidBy) || 0) + expense.amount
      );

      // Subtract from each participant's balance
      for (const split of expense.splits) {
        balances.set(
          split.userId,
          (balances.get(split.userId) || 0) - split.amount
        );
      }
    }

    return balances;
  }

  // Step 2: Minimize transactions using greedy algorithm
  simplifyDebts(balances: Map<string, number>): Transaction[] {
    const debtors = []; // Users who owe money (negative balance)
    const creditors = []; // Users owed money (positive balance)

    // Separate into two groups
    for (const [userId, balance] of balances) {
      if (balance < 0) {
        debtors.push({ userId, amount: Math.abs(balance) });
      } else if (balance > 0) {
        creditors.push({ userId, amount: balance });
      }
    }

    // Sort for consistent ordering
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions: Transaction[] = [];

    // Greedy matching: match largest debtor with largest creditor
    let debtorIdx = 0, creditorIdx = 0;

    while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
      const debtor = debtors[debtorIdx];
      const creditor = creditors[creditorIdx];

      const amount = Math.min(debtor.amount, creditor.amount);

      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: amount
      });

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount === 0) debtorIdx++;
      if (creditor.amount === 0) creditorIdx++;
    }

    return transactions;
  }

  // Step 3: Validate calculation
  validateCalculation(
    balances: Map<string, number>,
    transactions: Transaction[]
  ): boolean {
    let totalError = 0;

    for (const [, balance] of balances) {
      totalError += balance;
    }

    // Total should be zero (money conserved)
    return Math.abs(totalError) < 0.01; // Allow small rounding error
  }
}
```

### Advanced: Handle Concurrency & Consistency

```typescript
// Use database transactions and locks to prevent race conditions

async function updateExpenseAndBalance(
  groupId: string,
  expense: Expense
): Promise<void> {
  return await db.transaction(async (trx) => {
    // Lock the group to prevent concurrent modifications
    const group = await trx('groups')
      .where({ id: groupId })
      .forUpdate()
      .first();

    if (!group) throw new Error('Group not found');

    // Insert expense
    await trx('expenses').insert(expense);

    // Recalculate all balances for the group
    // This is atomic - either all succeed or all rollback
    const balances = await calculateGroupBalances(
      groupId,
      trx
    );

    // Update cached balances
    await updateBalanceCache(groupId, balances, trx);

    // Create activity log
    await trx('activity_logs').insert({
      group_id: groupId,
      action: 'expense_created',
      entity_type: 'expense',
      entity_id: expense.id,
      details: { amount: expense.amount }
    });
  });
}
```

---

## Frontend Structure

### React/React Native Architecture

#### Web (React SPA)

```
src/
├── pages/
│   ├── login.tsx
│   ├── signup.tsx
│   ├── dashboard.tsx
│   ├── groups/
│   │   ├── [id].tsx          (Group detail)
│   │   ├── create.tsx        (Create group)
│   │   └── [id]/expenses.tsx
│   ├── expenses/
│   │   ├── [id].tsx
│   │   └── create.tsx
│   └── profile.tsx
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── groups/
│   │   ├── GroupCard.tsx
│   │   ├── GroupDetail.tsx
│   │   └── MemberList.tsx
│   ├── expenses/
│   │   ├── ExpenseForm.tsx
│   │   ├── ExpenseList.tsx
│   │   ├── SplitCalculator.tsx
│   │   └── ReceiptUpload.tsx
│   ├── settlement/
│   │   ├── BalanceCard.tsx
│   │   ├── DebtSummary.tsx
│   │   └── SettlementFlow.tsx
│   └── common/
│       ├── Navigation.tsx
│       ├── Modal.tsx
│       └── LoadingSpinner.tsx
│
├── hooks/
│   ├── useAuth.ts
│   ├── useGroup.ts
│   ├── useExpense.ts
│   ├── useBalance.ts
│   └── useNotification.ts
│
├── store/
│   ├── authSlice.ts
│   ├── groupSlice.ts
│   ├── expenseSlice.ts
│   └── settingsSlice.ts
│
├── services/
│   ├── api.ts
│   ├── authService.ts
│   ├── groupService.ts
│   ├── expenseService.ts
│   └── settlementService.ts
│
├── utils/
│   ├── validators.ts
│   ├── formatters.ts
│   ├── calculations.ts
│   └── storage.ts
│
└── types/
    └── index.ts
```

#### Mobile (React Native)

```
src/
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── SignupScreen.tsx
│   ├── home/
│   │   ├── DashboardScreen.tsx
│   │   └── GroupsListScreen.tsx
│   ├── groups/
│   │   ├── GroupDetailScreen.tsx
│   │   ├── ExpenseListScreen.tsx
│   │   └── MembersScreen.tsx
│   ├── expenses/
│   │   ├── AddExpenseScreen.tsx
│   │   ├── SplitScreen.tsx
│   │   └── ReceiptCameraScreen.tsx
│   ├── settlement/
│   │   ├── BalanceScreen.tsx
│   │   ├── SettleUpScreen.tsx
│   │   └── UPIPaymentScreen.tsx
│   └── profile/
│       ├── ProfileScreen.tsx
│       └── SettingsScreen.tsx
│
├── components/
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── ...
│
├── navigation/
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── MainNavigator.tsx
│
├── store/
│   └── (same as web)
│
├── services/
│   └── (same as web)
│
└── native-modules/
    ├── UPIPayment.ts        (Native bridge)
    ├── CameraOCR.ts         (OCR via ML Kit)
    └── ShareSheet.ts        (Native sharing)
```

### State Management (Redux Toolkit)

```typescript
// Example: Expense Slice

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
}

const initialState: ExpenseState = {
  expenses: [],
  loading: false,
  error: null
};

export const fetchGroupExpenses = createAsyncThunk(
  'expenses/fetchGroupExpenses',
  async (groupId: string, { rejectWithValue }) => {
    try {
      const response = await expenseService.getGroupExpenses(groupId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    addExpense: (state, action) => {
      state.expenses.push(action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGroupExpenses.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGroupExpenses.fulfilled, (state, action) => {
        state.loading = false;
        state.expenses = action.payload;
      })
      .addCase(fetchGroupExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  }
});

export default expenseSlice.reducer;
```

---

## Deployment Strategy

### Docker Configuration

```dockerfile
# Dockerfile for backend

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

```dockerfile
# Dockerfile for frontend

FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Kubernetes Deployment

```yaml
# backend-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: splitwise-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: splitwise-api
  template:
    metadata:
      labels:
        app: splitwise-api
    spec:
      containers:
      - name: api
        image: splitwise-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: redis-config
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
      - name: error-monitor
        image: splunk-forwarder:latest
        volumeMounts:
        - name: logs
          mountPath: /var/log/app
      volumes:
      - name: logs
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: splitwise-api-service
spec:
  selector:
    app: splitwise-api
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml

name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
    steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v2
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run test
    - run: npm run test:integration

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Build Docker image
      run: docker build -t splitwise-api:${{ github.sha }} .
    - name: Push to ECR
      run: |
        aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com
        docker push ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.us-east-1.amazonaws.com/splitwise-api:${{ github.sha }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to EKS
      run: |
        aws eks update-kubeconfig --name splitwise-cluster
        kubectl set image deployment/splitwise-api api=splitwise-api:${{ github.sha }}
        kubectl rollout status deployment/splitwise-api
```

---

## Security Architecture

### Authentication & Authorization

```typescript
// JWT-based authentication with refresh tokens

interface JWTPayload {
  userId: string;
  email: string;
  groupIds: string[];
  iat: number;
  exp: number;
  iss: 'splitwise.app'
}

// Tokens
- Access Token: 15 minutes expiry
- Refresh Token: 7 days expiry (stored in HTTP-only cookie)
- MFA Token: Temporary, 5 minutes

// Authorization: Role-based (RBAC)
- owner: Full control
- admin: Can manage members and expenses
- member: Can view and add expenses

// Row-level security (PostgreSQL)
CREATE POLICY group_access_policy ON groups
  USING (
    id IN (
      SELECT group_id FROM group_members
      WHERE user_id = current_user_id
    )
  );
```

### Security Best Practices

```
1. API Security
   - Rate limiting (100 req/min per user)
   - CORS properly configured
   - HTTPS only
   - Input validation & sanitization
   - SQL injection prevention (Parameterized queries)
   - XSS protection (CSP headers)

2. Data Security
   - Encryption at rest (AWS KMS)
   - Encryption in transit (TLS 1.3)
   - PII encryption (passwords, SSN)
   - Password hashing (bcrypt with salt rounds: 12)
   - Secrets rotation (AWS Secrets Manager)

3. Infrastructure Security
   - VPC with private subnets
   - Security groups (firewall)
   - DDoS protection (AWS Shield)
   - WAF rules (AWS WAF)
   - Regular security audits

4. Monitoring & Incident Response
   - Anomaly detection (failed login attempts)
   - Audit logs (all user actions)
   - Intrusion detection
   - Incident response playbooks
```

---

## Scaling Strategy

### Horizontal Scaling

```
Current Architecture (Single Monolith)
┌─────────────────┐
│  App Instance   │
│  (API + Calc)   │
└─────────────────┘

Scaled Architecture (Microservices)
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  API Service │  │  API Service │  │  API Service │
└──────────────┘  └──────────────┘  └──────────────┘
        ↓                ↓                ↓
┌─────────────────────────────────────────────────┐
│         Shared Database + Cache Layer           │
│       (PostgreSQL + Redis + Kafka)              │
└─────────────────────────────────────────────────┘

Async Processing Layer
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Notification  │  │   Reporting  │  │    OCR       │
│  Service     │  │   Service    │  │  Service     │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Caching Strategy

```
Layer 1: Browser Cache
- Static assets (CSS, JS, images)
- Cache headers: max-age=3600

Layer 2: Redis Cache
- User sessions
- Computed balances (TTL: 5 minutes)
- Group data (TTL: 10 minutes)
- Notification queue

Layer 3: Database Query Cache
- Prepared statements
- Connection pooling (PgBouncer)
- Query result caching (20-second TTL)

Layer 4: CDN (CloudFront)
- Static frontend assets
- Images
- API responses (when applicable)
```

### Database Optimization

```
Read Replicas:
- Primary (write): us-east-1a
- Read Replicas: us-east-1b, us-east-1c
- Route reads to replicas, writes to primary
- Replication lag: < 100ms

Connection Pooling:
- PgBouncer: 1000 connections per client
- Min 10, max 100 connections per service
- Retry policy: exponential backoff

Partitioning:
- Expenses: by group_id (monthly partition)
- Activity Logs: by created_at (daily partition)
- Balances: by group_id

Materialized Views:
- Group statistics (updated hourly)
- User monthly reports (updated daily)
```

---

## Advanced Features (Differentiation)

### 1. AI-Powered Receipt OCR

```typescript
// Using Google Cloud Vision API + local ML

async function processReceiptOCR(imagePath: string) {
  // Cloud Vision for text extraction
  const vision = new vision.ImageAnnotatorClient();
  const request = {
    image: { source: { filename: imagePath } }
  };

  const [result] = await vision.documentTextDetection(request);
  const text = result.fullTextAnnotation.text;

  // Local ML model for line-item parsing
  const items = parseReceiptText(text);

  // Auto-split items among participants
  return {
    totalAmount: calculateTotal(items),
    items: items,
    suggestedSplit: suggestSplit(items, groupMembers)
  };
}

// Item Detection ML Model
// Input: ["1x Coffee @ $5.00", "2x Lunch @ $8.50 each", "Tip: 15%"]
// Output: [
//   { name: "Coffee", amount: 5.00, quantity: 1 },
//   { name: "Lunch", amount: 17.00, quantity: 2 },
//   { name: "Tip", amount: 3.40, quantity: 1 }
// ]
```

### 2. Smart Splitting Suggestions

```typescript
// ML-based splitting based on history

class SmartSplitter {

  async suggestSplit(
    expense: Expense,
    groupHistory: Expense[]
  ): Promise<SplitSuggestion> {
    // Analyze historical spending patterns
    const patterns = this.analyzePatterns(groupHistory);

    // User spending clusters
    // e.g., Alice always pays for meals, Bob always splits equally

    // Suggest split based on:
    // 1. Category (meals -> who eats)
    // 2. Amount (large amounts -> equal split)
    // 3. Time (late night -> different subset)
    // 4. Location (geo-tagging)
    // 5. Historical patterns

    return {
      suggestedSplit: {
        'user1': 30,
        'user2': 40,  // Higher share - history shows
        'user3': 30
      },
      confidence: 0.87,
      reason: "Based on meal preferences and historical patterns"
    };
  }
}
```

### 3. UPI/Payment Integration (India-specific)

```typescript
// Real-time settlement via UPI/Razorpay

async function settleDebtViaUPI(
  fromUser: User,
  toUser: User,
  amount: number
) {
  // Create Razorpay payment link
  const payment = await razorpay.paymentLink.create({
    amount: amount * 100,  // In paise
    currency: 'INR',
    accept_partial: false,
    notify: {
      sms: true,
      email: true
    },
    customer_notify: 1,
    reference_id: `settlement_${fromUser.id}_${toUser.id}`,
    upi_link: true,  // UPI payment link
    callback_url: 'https://api.splitwise.app/settlement-callback',
    callback_method: 'get'
  });

  // Send UPI link via SMS/WhatsApp
  await sendUPILink(fromUser, payment.short_url);

  // Webhook handler for payment confirmation
  return {
    paymentLink: payment.short_url,
    status: 'pending',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };
}
```

### 4. Real-time Updates (WebSockets)

```typescript
// Socket.IO for real-time collaboration

io.on('connection', (socket) => {

  socket.on('join_group', (groupId) => {
    socket.join(`group:${groupId}`);
  });

  socket.on('expense_added', (expense) => {
    // Broadcast to all members of group
    io.to(`group:${expense.groupId}`).emit('expense_added', {
      expense,
      updatedBalances: recalculateBalances(expense.groupId)
    });
  });

  socket.on('member_typing', (groupId) => {
    socket.to(`group:${groupId}`).emit('member_typing');
  });
});

// Real-time balance updates
class BalanceStream {
  async *streamGroupBalances(groupId: string) {
    const redis = getRedisClient();

    // Subscribe to balance change channel
    for await (const message of redis.subscribe(`balances:${groupId}`)) {
      yield JSON.parse(message);
    }
  }
}
```

### 5. Analytics & Insights Dashboard

```typescript
// Advanced analytics using ClickHouse

interface GroupAnalytics {
  totalSpent: number;
  averagePerExpense: number;
  spendingTrend: DailySpending[];
  categoryBreakdown: CategorySpending[];
  memberContribution: MemberStats[];
  settlementHistory: Settlement[];
  forecastedDebts: ProjectedDebt[];
}

// Monthly spending trend
SELECT
  DATE_TRUNC('day', date) as day,
  SUM(amount) as total,
  COUNT(*) as count
FROM expenses
WHERE group_id = $1
GROUP BY day
ORDER BY day DESC

// Spending by category with YoY comparison
SELECT
  category,
  SUM(CASE WHEN YEAR(date) = YEAR(NOW()) THEN amount ELSE 0 END) as this_year,
  SUM(CASE WHEN YEAR(date) = YEAR(NOW()) - 1 THEN amount ELSE 0 END) as last_year,
  (SUM(CASE WHEN YEAR(date) = YEAR(NOW()) THEN amount ELSE 0 END) /
   SUM(CASE WHEN YEAR(date) = YEAR(NOW()) - 1 THEN amount ELSE 0 END) - 1) * 100 as growth_pct
FROM expenses
WHERE group_id = $1
GROUP BY category
```

### 6. Expense Prediction & Budgeting

```typescript
// ML-based expense forecasting

class ExpenseForecaster {

  async predictMonthlyExpense(userId: string): Promise<Forecast> {
    // Gather historical data
    const history = await getUserExpenseHistory(userId, 12); // 12 months

    // ARIMA model or Prophet for time-series forecasting
    const forecast = await this.prophet.forecast(
      history,
      periods: 30
    );

    return {
      predicted: forecast.yhat,
      interval: {
        lower: forecast.yhat_lower,
        upper: forecast.yhat_upper
      },
      accuracy: forecast.mape
    };
  }

  // Budget alerts
  async checkBudgetThreshold(groupId: string) {
    const currentSpent = await getCurrentMonthSpent(groupId);
    const budget = await getBudget(groupId);

    if (currentSpent / budget.total > 0.8) {
      // Alert group that they're at 80% of budget
      notifyGroup(groupId, {
        type: 'budget_warning',
        spent: currentSpent,
        budget: budget.total,
        remaining: budget.total - currentSpent
      });
    }
  }
}
```

---

## Edge Cases & Solutions

### 1. Rounding Errors

```typescript
// Problem: Equal split of $10 among 3 people = $3.33 each, remainder $0.01

function splitWithRoundingHandling(
  amount: Decimal,
  participants: number
): Decimal[] {
  // Use Decimal.js for arbitrary precision
  const perPerson = amount.dividedBy(participants);
  const splitAmounts = Array(participants).fill(perPerson.round(2));

  // Distribute remainder
  const remainder = amount.minus(perPerson.times(participants)).round(2);
  splitAmounts[0] = splitAmounts[0].plus(remainder);

  return splitAmounts;
}

// Result: [$3.34, $3.33, $3.33] (no loss of money)
```

### 2. Concurrent Expense Updates

```typescript
// Problem: Two users add expenses simultaneously

// Solution: Optimistic locking with version field

async function updateExpenseWithLocking(
  expenseId: string,
  updates: Partial<Expense>,
  currentVersion: number
) {
  const result = await db.raw(
    `UPDATE expenses
     SET version = version + 1, ...updates
     WHERE id = $1 AND version = $2
     RETURNING *`,
    [expenseId, currentVersion]
  );

  if (result.rowCount === 0) {
    throw new Error('Expense was modified. Please refresh and try again.');
  }

  return result.rows[0];
}
```

### 3. Stale Cache Issues

```typescript
// Problem: Balance cache doesn't reflect recent expenses

class CacheInvalidation {
  async addExpenseWithCacheUpdate(expense: Expense) {
    // Add expense to database
    const savedExpense = await db('expenses').insert(expense);

    // Immediately invalidate affected caches
    await redis.del(`balance:${expense.groupId}:*`);
    await redis.del(`group:${expense.groupId}`);

    // Publish event for WebSocket subscribers
    await redis.publish(
      `balances:${expense.groupId}`,
      JSON.stringify({ type: 'balance_updated', expense: savedExpense })
    );

    return savedExpense;
  }
}
```

### 4. User Removal from Group

```typescript
// Problem: User is removed, but still has open debts

async function removeUserFromGroup(
  groupId: string,
  userId: string
) {
  // Get unsettled transactions
  const unsettled = await getUnsettledTransactions(groupId, userId);

  if (unsettled.length > 0) {
    // Option 1: Prevent removal
    throw new Error('User has unsettled debts. Settle first.');

    // Option 2: Create settlement records
    // Generate "system" settlements for all outstanding debts
    for (const debt of unsettled) {
      await db('settlements').insert({
        from_user_id: debt.from,
        to_user_id: debt.to,
        amount: debt.amount,
        status: 'pending_removal'
      });
    }
  }

  // Soft-delete user from group
  await db('group_members')
    .where({ group_id: groupId, user_id: userId })
    .update({ is_active: false });
}
```

---

## Performance Benchmarks & Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time (p95) | < 200ms | Monitor |
| Balance Calculation (100 expenses) | < 50ms | Optimize |
| Page Load Time | < 2s | Monitor |
| Mobile App Startup | < 3s | Optimize |
| Database Query (indexed) | < 10ms | Target |
| Cache Hit Rate | > 85% | Monitor |
| Concurrent Users | 10,000+ | Test |
| Monthly Active Users Capacity | 1M | Scale |

---

## Summary & Next Steps

This architecture provides:

✅ Scalability (horizontally scale services)
✅ Reliability (database transactions, caching)
✅ Performance (optimized queries, caching layers)
✅ Security (encryption, RBAC, audit logs)
✅ Maintainability (microservices, clear separation)
✅ Cost-effective (cloud-native, serverless components)

**Recommended Implementation Order:**

1. **Phase 1 (Week 1-2)**: Core API + Database schema
2. **Phase 2 (Week 3-4)**: Balance calculation + Settlement logic
3. **Phase 3 (Week 5-6)**: Web Frontend
4. **Phase 4 (Week 7-8)**: Mobile App + Real-time updates
5. **Phase 5 (Week 9-10)**: Advanced features (OCR, UPI, Analytics)
6. **Phase 6 (Week 11-12)**: Production deployment + Monitoring

---

**Questions? Let me know, and I'll provide deeper implementation details for any section.**
