# Splitwise - Cost Splitting App

A full-featured cost-splitting application built with Next.js (web) and React Native/Expo (mobile). Track shared expenses and automatically calculate who owes whom.

## Features

- ✅ Create groups and add members
- ✅ Track shared expenses
- ✅ Automatically calculate balances
- ✅ View settlement recommendations
- ✅ Support for equal or custom splits
- ✅ Web and mobile interfaces

## Project Structure

```
splitwise/
├── web/              # Next.js web app (backend + frontend)
│   ├── app/          # Next.js App Router pages and API routes
│   ├── prisma/       # Database schema and migrations
│   ├── lib/          # Shared utilities (balance calculation)
│   └── package.json
└── mobile/           # Expo React Native app
    ├── app/          # Expo Router screens
    ├── api/          # API client
    └── package.json
```

## Technology Stack

### Web
- **Framework**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **API**: REST with Next.js API Routes

### Mobile
- **Framework**: Expo (React Native)
- **Routing**: Expo Router
- **HTTP Client**: Axios
- **API**: Connects to the same backend API

## Getting Started

### Prerequisites
- Node.js v20+
- npm or yarn

### Installation & Setup

#### 1. Web App

```bash
cd web
npm install
npm run db:push  # Create the database
npm run dev      # Start development server
```

The web app will be available at `http://localhost:3000`

#### 2. Mobile App

```bash
cd mobile
npm install
npm run start    # Start Expo development server
```

Then:
- Press `w` for web preview
- Scan QR code with Expo Go app for iOS/Android testing
- Or use `npm run ios` or `npm run android` directly

## Usage

### Web App
1. Open http://localhost:3000
2. Click "New Group" to create a group
3. Add members by providing their name and email
4. Select members for the group
5. Create group
6. Add expenses by clicking "Add Expense"
7. Enter amount, description, who paid, and how to split
8. View balances and settlement recommendations

### Mobile App
1. Launch Expo app
2. Create a new group with members
3. Add expenses to track costs
4. View real-time balances
5. See who owes whom

## API Endpoints

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create new user

### Groups
- `GET /api/groups` - List all groups
- `POST /api/groups` - Create new group
- `POST /api/groups/:id/members` - Add member to group

### Expenses
- `GET /api/groups/:id/expenses` - Get group expenses
- `POST /api/groups/:id/expenses` - Add expense

### Balances & Settlements
- `GET /api/groups/:id/balances` - Calculate group balances
- `POST /api/groups/:id/settle` - Record settlement

## Database Schema

- **User**: id, name, email
- **Group**: id, name, createdAt
- **GroupMember**: id, groupId, userId
- **Expense**: id, description, amount, paidById, groupId
- **ExpenseSplit**: id, expenseId, userId, amount
- **Settlement**: id, groupId, fromUserId, toUserId, amount

## How Balance Calculation Works

The app uses a greedy algorithm to minimize the number of transactions needed to settle all debts:

1. Calculate each user's net balance (paid - owed)
2. Separate users into debtors and creditors
3. Match debtors with creditors greedily
4. Generate minimum number of transactions

Example:
- Alice paid $100, owes $50 → balance: +$50
- Bob paid $0, owes $40 → balance: -$40
- Charlie paid $0, owes $20 → balance: -$20

Settlement:
- Bob pays Alice $40
- Charlie pays Alice $20

## Development Notes

- The database is SQLite (`dev.db`) stored locally - perfect for development
- The mobile app connects to the backend via the API (configure `EXPO_PUBLIC_API_URL` in `.env.local`)
- All data is stored in the SQLite database
- No authentication implemented - designed for local/group use

## Future Enhancements

- User authentication (JWT)
- Firebase/cloud database support
- Payment history and analytics
- Export to CSV/PDF
- Multi-currency support
- Recurring expenses
- Bill reminders

## License

MIT
