// Configuration file to resolve Backend API URL when deployed separately
const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If previewed inside AI Studio (development container or pre-release container)
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".run.app")
    ) {
      return "";
    }
  }
  return (import.meta as any).env?.VITE_API_URL || "";
};

export const API_BASE_URL = getApiBaseUrl();
