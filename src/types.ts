export interface User {
  id: string;
  name: string;
  email: string;
  hostel: string;
  roomNumber: string;
  role: "student" | "admin";
  phone?: string | null;
  regNo?: string | null;
}

export interface Equipment {
  id: string;
  name: string;
  totalQuantity: number;
  availableQuantity: number;
}

export interface Issue {
  id: string;
  studentId: string;
  equipmentId: string;
  quantity: number;
  issueDate: string;
  dueDate: string;
  returnDate: string | null;
  status: "Active" | "Overdue" | "Return Requested" | "Returned";
  equipmentName?: string;
  studentName?: string;
  studentEmail?: string;
  hostel?: string;
  roomNumber?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}
