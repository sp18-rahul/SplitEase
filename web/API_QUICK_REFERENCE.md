# API Quick Reference

**Base URL**: `http://localhost:3000`

---

## Users

### Create User (Register)
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}

Response (201):
{
  "message": "User created successfully",
  "userId": "5"
}
```

### List All Users
```bash
GET /api/users

Response (200):
[
  {
    "id": 1,
    "name": "Demo User",
    "email": "demo@example.com"
  }
]
```

---

## Groups

### Create Group
```bash
POST /api/groups
Content-Type: application/json

{
  "name": "Vacation 2026",
  "memberIds": [2, 3, 4]
}

Response (201):
{
  "id": 1,
  "name": "Vacation 2026",
  "members": [...],
  "createdAt": "2026-03-23T13:43:23.155Z"
}
```

### List All Groups
```bash
GET /api/groups

Response (200):
[
  {
    "id": 1,
    "name": "Vegas Trip",
    "members": [...]
  }
]
```

### Get Group Details
```bash
GET /api/groups/1

Response (200):
{
  "id": 1,
  "name": "Vegas Trip",
  "members": [...],
  "expenses": [...]
}
```

### Add Member to Group
```bash
POST /api/groups/1/members
Content-Type: application/json

{
  "userId": 5
}

Response (201):
{
  "id": 10,
  "groupId": 1,
  "userId": 5,
  "user": {...}
}
```

---

## Expenses

### Add Expense
```bash
POST /api/groups/1/expenses
Content-Type: application/json

{
  "description": "Hotel",
  "amount": 300,
  "paidById": 2,
  "splits": [
    {"userId": 1, "amount": 75},
    {"userId": 2, "amount": 75},
    {"userId": 3, "amount": 75},
    {"userId": 4, "amount": 75}
  ]
}

Response (201):
{
  "id": 1,
  "description": "Hotel",
  "amount": 300,
  "paidById": 2,
  "paidBy": {"id": 2, "name": "Alice"},
  "splits": [...]
}
```

### List Expenses in Group
```bash
GET /api/groups/1/expenses

Response (200):
[
  {
    "id": 1,
    "description": "Hotel",
    "amount": 300,
    "paidBy": {...},
    "splits": [...]
  }
]
```

---

## Balances & Settlements

### Calculate Balances
```bash
GET /api/groups/1/balances

Response (200):
{
  "balances": {
    "1": -105,
    "2": 195,
    "3": 15,
    "4": -105
  },
  "transactions": [
    {
      "fromUserId": 1,
      "toUserId": 2,
      "amount": 105
    },
    {
      "fromUserId": 4,
      "toUserId": 2,
      "amount": 90
    },
    {
      "fromUserId": 4,
      "toUserId": 3,
      "amount": 15
    }
  ],
  "members": [...]
}
```

**Understanding Balances**:
- Positive: User is owed money
- Negative: User owes money
- `transactions`: Minimum payments needed to settle

### Record Settlement
```bash
POST /api/groups/1/settle
Content-Type: application/json

{
  "fromUserId": 1,
  "toUserId": 2,
  "amount": 105
}

Response (201):
{
  "id": 1,
  "groupId": 1,
  "fromUserId": 1,
  "toUserId": 2,
  "amount": 105,
  "fromUser": {...},
  "toUser": {...},
  "createdAt": "2026-03-23T..."
}
```

---

## Full Example Flow

```bash
# 1. Create users
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@ex.com","password":"pass123"}'

curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Bob","email":"bob@ex.com","password":"pass123"}'

# 2. Create group
curl -X POST http://localhost:3000/api/groups \
  -H "Content-Type: application/json" \
  -d '{"name":"Road Trip","memberIds":[2,3]}'

# 3. Add expense (Alice paid $300 for gas, Bob owes $150)
curl -X POST http://localhost:3000/api/groups/1/expenses \
  -H "Content-Type: application/json" \
  -d '{
    "description":"Gas",
    "amount":300,
    "paidById":2,
    "splits":[{"userId":2,"amount":150},{"userId":3,"amount":150}]
  }'

# 4. Check balances
curl http://localhost:3000/api/groups/1/balances

# 5. Record settlement (Bob pays Alice $150)
curl -X POST http://localhost:3000/api/groups/1/settle \
  -H "Content-Type: application/json" \
  -d '{"fromUserId":3,"toUserId":2,"amount":150}'
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "error": "Group not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Testing Tools

### Using curl
```bash
curl -X POST http://localhost:3000/api/... \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### Using httpie
```bash
http POST localhost:3000/api/... name="value"
```

### Using Postman
Import the endpoints above into Postman collections

### Using the browser
Simply visit:
- http://localhost:3000/api/groups
- http://localhost:3000/api/users

---

## Demo Account

Always available for testing:
```
Email: demo@example.com
Password: password123
```

---

## Notes

- All endpoints return JSON
- Use `Content-Type: application/json` for POST requests
- User IDs are integers (starting at 1)
- Amounts are numbers (floats)
- All timestamps are ISO 8601 format
