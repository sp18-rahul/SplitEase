// Mock in-memory database
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Group {
  id: number;
  name: string;
  members: { userId: number; user: User }[];
  expenses: Expense[];
  createdAt: Date;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  paidById: number;
  paidBy: User;
  groupId: number;
  splits: { userId: number; amount: number }[];
  createdAt: Date;
}

// Data stores
export const mockUsers: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
  { id: 3, name: "Charlie", email: "charlie@example.com" },
];

export const mockGroups: Group[] = [
  {
    id: 1,
    name: "Vegas Trip",
    members: [
      { userId: 1, user: mockUsers[0] },
      { userId: 2, user: mockUsers[1] },
      { userId: 3, user: mockUsers[2] },
    ],
    expenses: [
      {
        id: 1,
        description: "Hotel",
        amount: 300,
        paidById: 1,
        paidBy: mockUsers[0],
        groupId: 1,
        splits: [
          { userId: 1, amount: 100 },
          { userId: 2, amount: 100 },
          { userId: 3, amount: 100 },
        ],
        createdAt: new Date(),
      },
      {
        id: 2,
        description: "Dinner",
        amount: 120,
        paidById: 2,
        paidBy: mockUsers[1],
        groupId: 1,
        splits: [
          { userId: 1, amount: 40 },
          { userId: 2, amount: 40 },
          { userId: 3, amount: 40 },
        ],
        createdAt: new Date(),
      },
    ],
    createdAt: new Date(),
  },
];

let nextUserId = 4;
let nextGroupId = 2;
let nextExpenseId = 3;

export function createUser(name: string, email: string) {
  const user: User = { id: nextUserId++, name, email };
  mockUsers.push(user);
  return user;
}

export function createGroup(name: string, memberIds: number[]) {
  const members = memberIds.map((userId) => ({
    userId,
    user: mockUsers.find((u) => u.id === userId)!,
  }));

  const group: Group = {
    id: nextGroupId++,
    name,
    members,
    expenses: [],
    createdAt: new Date(),
  };
  mockGroups.push(group);
  return group;
}

export function addExpense(
  groupId: number,
  description: string,
  amount: number,
  paidById: number,
  splits: { userId: number; amount: number }[]
) {
  const group = mockGroups.find((g) => g.id === groupId);
  if (!group) throw new Error("Group not found");

  const expense: Expense = {
    id: nextExpenseId++,
    description,
    amount,
    paidById,
    paidBy: mockUsers.find((u) => u.id === paidById)!,
    groupId,
    splits,
    createdAt: new Date(),
  };
  group.expenses.push(expense);
  return expense;
}

export function getGroupWithMembers(groupId: number) {
  const group = mockGroups.find((g) => g.id === groupId);
  return group
    ? {
        ...group,
        members: group.members,
        expenses: group.expenses,
      }
    : null;
}
