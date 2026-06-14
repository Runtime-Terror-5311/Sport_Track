// Configuration file to resolve Backend API URL when deployed separately
export const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "";
