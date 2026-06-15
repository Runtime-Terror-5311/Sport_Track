import { Equipment, Issue, User } from "../types";
import { API_BASE_URL } from "../config";

// Dynamic API caller that extracts JWT from localStorage automatically
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("sports_tracker_token");
  
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Students
  getStudents: (search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiCall<User[]>(`/api/students${query}`);
  },

  addStudent: (studentData: {
    name: string;
    email: string;
    hostel: string;
    roomNumber: string;
    phone?: string;
    regNo?: string;
  }) => {
    return apiCall<{ message: string; student: any }>("/api/students", {
      method: "POST",
      body: JSON.stringify(studentData),
    });
  },

  // Equipment Management
  getEquipment: () => {
    return apiCall<Equipment[]>("/api/equipment");
  },

  addEquipment: (name: string, totalQuantity: number) => {
    return apiCall<Equipment>("/api/equipment", {
      method: "POST",
      body: JSON.stringify({ name, totalQuantity }),
    });
  },

  editEquipment: (
    id: string,
    updates: { name?: string; totalQuantity?: number; availableQuantity?: number }
  ) => {
    return apiCall<Equipment>(`/api/equipment/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  deleteEquipment: (id: string) => {
    return apiCall<{ message: string }>(`/api/equipment/${id}`, {
      method: "DELETE",
    });
  },

  // Issue Tracking
  getMyIssued: () => {
    return apiCall<Issue[]>("/api/issues/my");
  },

  requestReturn: (issueId: string) => {
    return apiCall<Issue>(`/api/issues/my/${issueId}/return`, {
      method: "POST",
    });
  },

  getActiveIssues: () => {
    return apiCall<Issue[]>("/api/issues/active");
  },

  issueEquipment: (studentId: string, equipmentId: string, quantity: number) => {
    return apiCall<Issue>("/api/issues/issue", {
      method: "POST",
      body: JSON.stringify({ studentId, equipmentId, quantity }),
    });
  },

  confirmReturn: (issueId: string) => {
    return apiCall<{ message: string }>(`/api/issues/return/${issueId}/confirm`, {
      method: "POST",
    });
  },

  importStudents: async (file: File) => {
    const token = localStorage.getItem("sports_tracker_token");
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/students/import`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return data as {
      summary: {
        totalRows: number;
        imported: number;
        duplicates: number;
        errors: number;
      };
      errorReportCsv: string;
    };
  },

  deleteStudent: (studentId: string) => {
    return apiCall<{ message: string }>(`/api/students/${studentId}`, {
      method: "DELETE",
    });
  },

  getStudentByRoom: (roomNumber: string) => {
    return apiCall<User>(`/api/students/by-room?roomNumber=${encodeURIComponent(roomNumber)}`, {
      method: "GET",
    });
  },

  getMonthlyReport: (year: number, month: number) => {
    return apiCall<any>(`/api/issues/report?year=${year}&month=${month}`);
  },

  dispatchAndPurgeReport: (year: number, month: number, recipientEmail?: string) => {
    return apiCall<any>("/api/issues/report/dispatch-purge", {
      method: "POST",
      body: JSON.stringify({ year, month, recipientEmail }),
    });
  },

  // AI Sports Assistant
  getAIChatHistory: () => {
    return apiCall<any[]>("/api/ai/history");
  },
  sendAIChatMessage: (message: string) => {
    return apiCall<{ answer: string; chat: any }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },
  clearAIChatHistory: () => {
    return apiCall<{ message: string }>("/api/ai/history", {
      method: "DELETE",
    });
  },
};
