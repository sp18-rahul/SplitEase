import axios from "axios";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

let onLogoutCallback: (() => void) | null = null;

// Set callback to trigger logout on 401
export function setOnUnauthorized(callback: () => void) {
  onLogoutCallback = callback;
}

// Set mobile user id header for all requests (called after login)
export function setMobileUserId(userId: number | null) {
  if (userId) {
    api.defaults.headers.common["X-Mobile-User-Id"] = String(userId);
  } else {
    delete api.defaults.headers.common["X-Mobile-User-Id"];
  }
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.message || "Network error";

    // Handle 401/403 - user is unauthorized (don't log as error, it's expected)
    if (status === 401 || status === 403) {
      if (onLogoutCallback) {
        onLogoutCallback();
      }
    } else {
      // Log other errors for debugging
      console.error("API Error:", {
        status,
        data: error.response?.data,
        message,
        url: error.config?.url,
      });
    }

    // Handle network errors
    if (error.code === "ECONNABORTED") {
      return Promise.reject({
        ...error,
        message: "Request timeout - check your connection"
      });
    }

    if (!error.response && error.message === "Network Error") {
      return Promise.reject({
        ...error,
        message: "Network connection failed - check your internet"
      });
    }

    // Don't hide the error, let the calling code handle it
    return Promise.reject(error);
  }
);

// Users
export const users = {
  getAll: () => api.get("/users"),
  findByEmail: (email: string) =>
    api.get(`/users?email=${encodeURIComponent(email)}`),
  search: (query: string) =>
    api.get(`/users/search?q=${encodeURIComponent(query)}`),
  create: (data: { name: string; email: string }) => api.post("/users", data),
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data: { name?: string; upiId?: string }) =>
    api.patch("/users/profile", data),
  updateTheme: (theme: string) =>
    api.patch("/users/theme", { theme }),
  sendFriendRequest: (userId: number) =>
    api.post(`/users/${userId}/friend-request`, {}),
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
  update: (groupId: number, data: { name?: string; emoji?: string }) =>
    api.patch(`/groups/${groupId}`, data),
  delete: (groupId: number) =>
    api.delete(`/groups/${groupId}`),
  addMember: (groupId: number, userId: number) =>
    api.post(`/groups/${groupId}/members`, { userId }),
  removeMember: (groupId: number, userId: number) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
  generateInvite: (groupId: number) =>
    api.post(`/groups/${groupId}/invite`, {}),
  revokeInvite: (groupId: number) =>
    api.delete(`/groups/${groupId}/invite`),
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
      receiptUri?: string;
    }
  ) => {
    if (data.receiptUri) {
      const formData = new FormData();
      formData.append("description", data.description);
      formData.append("amount", String(data.amount));
      formData.append("paidById", String(data.paidById));
      formData.append("splits", JSON.stringify(data.splits));
      if (data.category) formData.append("category", data.category);
      if (data.notes) formData.append("notes", data.notes);
      formData.append("receipt", {
        uri: data.receiptUri,
        type: "image/jpeg",
        name: "receipt.jpg",
      } as any);
      return api.post(`/groups/${groupId}/expenses`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return api.post(`/groups/${groupId}/expenses`, data);
  },
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
      receiptUri?: string;
    }
  ) => {
    if (data.receiptUri) {
      const formData = new FormData();
      formData.append("description", data.description);
      formData.append("amount", String(data.amount));
      formData.append("paidById", String(data.paidById));
      formData.append("splits", JSON.stringify(data.splits));
      if (data.category) formData.append("category", data.category);
      if (data.notes) formData.append("notes", data.notes);
      formData.append("receipt", {
        uri: data.receiptUri,
        type: "image/jpeg",
        name: "receipt.jpg",
      } as any);
      return api.patch(`/groups/${groupId}/expenses/${expenseId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    return api.patch(`/groups/${groupId}/expenses/${expenseId}`, data);
  },
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
  delete: (groupId: number, settlementId: number) =>
    api.delete(`/groups/${groupId}/settle/${settlementId}`),
  sendReminder: (
    groupId: number,
    data: { fromUserId: number; toUserId: number; amount: number }
  ) => api.post(`/groups/${groupId}/remind`, data),
};

// Activity
export const activityApi = {
  getByGroup: (groupId: number) => api.get(`/groups/${groupId}/activity`),
};

// Personal Expenses (all expenses the user paid or is split into, across all groups)
export const personalExpenses = {
  getAll: () => api.get("/expenses"),
};

// Export
export const exportApi = {
  getCSV: (groupId: number) =>
    api.get(`/groups/${groupId}/export`, { responseType: "text" }),
};

// Auth extras
export const authApi = {
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
};

// Email
export const emailApi = {
  sendWelcome: (to: string, name: string, password: string, groupName?: string, inviterName?: string) =>
    api.post("/email/send-welcome", { to, name, password, groupName, inviterName }),
};
