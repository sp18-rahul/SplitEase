import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

// Set mobile user id header for all requests (called after login)
export function setMobileUserId(userId: number | null) {
  if (userId) {
    api.defaults.headers.common["X-Mobile-User-Id"] = String(userId);
  } else {
    delete api.defaults.headers.common["X-Mobile-User-Id"];
  }
}

// Users
export const users = {
  getAll: () => api.get("/users"),
  findByEmail: (email: string) =>
    api.get(`/users?email=${encodeURIComponent(email)}`),
  create: (data: { name: string; email: string }) => api.post("/users", data),
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data: { name?: string; upiId?: string }) =>
    api.patch("/users/profile", data),
};

// Groups
export const groups = {
  getAll: () => api.get("/groups"),
  getById: (id: number) => api.get(`/groups/${id}`),
  create: (data: {
    name: string;
    memberIds: number[];
    currency?: string;
    emoji?: string;
  }) => api.post("/groups", data),
  addMember: (groupId: number, userId: number) =>
    api.post(`/groups/${groupId}/members`, { userId }),
};

// Expenses
export const expenses = {
  getByGroup: (groupId: number) => api.get(`/groups/${groupId}/expenses`),
  create: (
    groupId: number,
    data: {
      description: string;
      amount: number;
      paidById: number;
      splits: { userId: number; amount: number }[];
      category?: string;
      notes?: string;
    }
  ) => api.post(`/groups/${groupId}/expenses`, data),
  update: (
    groupId: number,
    expenseId: number,
    data: {
      description: string;
      amount: number;
      paidById: number;
      splits: { userId: number; amount: number }[];
      category?: string;
      notes?: string;
    }
  ) => api.patch(`/groups/${groupId}/expenses/${expenseId}`, data),
  delete: (groupId: number, expenseId: number) =>
    api.delete(`/groups/${groupId}/expenses/${expenseId}`),
};

// Balances
export const balances = {
  getByGroup: (groupId: number) => api.get(`/groups/${groupId}/balances`),
};

// Settlements
export const settlements = {
  create: (
    groupId: number,
    data: { fromUserId: number; toUserId: number; amount: number }
  ) => api.post(`/groups/${groupId}/settle`, data),
};

// Activity
export const activityApi = {
  getByGroup: (groupId: number) => api.get(`/groups/${groupId}/activity`),
};

// Export
export const exportApi = {
  getCSV: (groupId: number) =>
    api.get(`/groups/${groupId}/export`, { responseType: "text" }),
};
