import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { Issue } from "../types";
import { LogOut, Calendar, RefreshCcw, BellRing, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [issuedHistory, setIssuedHistory] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load My Issued items
  const loadIssued = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMyIssued();
      setIssuedHistory(data);
    } catch (err: any) {
      setError(err.message || "Failed to load issued equipment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssued();
  }, []);

  const handleRequestReturn = async (issueId: string) => {
    try {
      setActionLoading(issueId);
      setError(null);
      await api.requestReturn(issueId);
      // Re-fetch list
      await loadIssued();
    } catch (err: any) {
      setError(err.message || "Could not complete return request");
    } finally {
      setActionLoading(null);
    }
  };

  const cleanDate = (isoString: string): string => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "N/A";
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  // Helper styling for status indicators
  const getStatusBadge = (status: Issue["status"]) => {
    switch (status) {
      case "Active":
        return {
          bg: "bg-green-100 text-green-700 border-green-200 font-bold uppercase",
          dots: "bg-green-600",
          label: "Active",
        };
      case "Overdue":
        return {
          bg: "bg-red-100 text-red-700 border-red-200 font-bold uppercase animate-pulse",
          dots: "bg-red-650",
          label: "Overdue",
        };
      case "Return Requested":
        return {
          bg: "bg-blue-100 text-blue-700 border-blue-200 font-bold uppercase",
          dots: "bg-blue-600",
          label: "Pending",
        };
      default:
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-205",
          dots: "bg-slate-500",
          label: status,
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col justify-between max-w-md mx-auto relative border-x border-slate-200 shadow-2xl">
      {/* Mobile-First Header */}
      <div>
        <header className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 z-10 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black text-slate-400 font-mono tracking-widest uppercase">Student Portal</span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {user?.name || "Arjun Sharma"}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {user?.hostel || "Ganga Hostel"} &bull; Room {user?.roomNumber || "304"}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2.5 hover:bg-slate-100 text-slate-600 hover:text-red-600 rounded-xl transition duration-150 border border-slate-200 cursor-pointer"
              title="Logout"
              id="student_logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Info Banner */}
        <main className="p-4 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              My Issued Equipment
            </h2>
            <button
              onClick={loadIssued}
              disabled={loading}
              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded border border-transparent hover:border-slate-200 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Loader */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <span className="w-8 h-8 border-3 border-blue-100 border-t-blue-600 rounded-full animate-spin"></span>
              <p className="text-xs text-slate-500 font-mono">Retrieving your inventory...</p>
            </div>
          )}

          {/* Error display */}
          {error && !loading && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && issuedHistory.length === 0 && (
            <div className="text-center bg-white border border-dashed border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Clear Records!</p>
              <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto">
                No active Issued Equipment. Ask the Sports Secretary to check out items for you.
              </p>
            </div>
          )}

          {/* Equipment Cards List */}
          {!loading && issuedHistory.length > 0 && (
            <div className="space-y-3.5">
              {issuedHistory.map((issue) => {
                const isOverdue = issue.status === "Overdue";
                const isReturnRequested = issue.status === "Return Requested";
                const badge = getStatusBadge(issue.status);

                return (
                  <div
                    key={issue.id}
                    className={`bg-white rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${
                      isOverdue ? "border-red-200 bg-red-50/20" : "border-slate-200"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 leading-tight">
                          {issue.equipmentName}
                        </h3>
                        <p className="text-xs text-slate-550 text-slate-550 text-slate-500 mt-0.5 font-bold uppercase font-mono tracking-tight">
                          Issued count: {issue.quantity}
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* Timeline Grid */}
                    <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs mb-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Issued Date</p>
                        <p className="font-bold text-slate-700 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {cleanDate(issue.issueDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Return Due</p>
                        <p
                          className={`font-bold mt-0.5 flex items-center gap-1 ${
                            isOverdue ? "text-red-600" : "text-slate-700"
                          }`}
                        >
                          <Calendar className={`w-3.5 h-3.5 ${isOverdue ? "text-red-500" : "text-slate-400"}`} />
                          {cleanDate(issue.dueDate)}
                        </p>
                      </div>
                    </div>

                    {/* Action button */}
                    <div>
                      {isReturnRequested ? (
                        <div className="w-full py-2.5 bg-blue-50 text-blue-800 border border-blue-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 uppercase tracking-wide">
                          <BellRing className="w-4 h-4 text-blue-600 animate-pulse" />
                          <span>Return requested by you</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRequestReturn(issue.id)}
                          disabled={actionLoading !== null}
                          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isOverdue
                              ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 active:scale-[0.98]"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 active:scale-[0.98]"
                          }`}
                        >
                          {actionLoading === issue.id ? (
                            <span className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin"></span>
                          ) : (
                            <span>Request Return</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Portal Notices */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-xs text-slate-500">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <HelpCircle className="w-4 h-4 text-slate-400" />
              Portal Guidelines:
            </h4>
            <ul className="list-disc list-inside space-y-1 pl-0.5 text-slate-500 font-medium">
              <li>Sports equipment can be issued for up to <strong>3 days</strong>.</li>
              <li>Please request a return online before turning in items to the sports room.</li>
              <li>Overdue items are flagged in <span className="text-red-600 font-bold font-mono">red</span> and require priority hand-in.</li>
            </ul>
          </div>
        </main>
      </div>

      {/* Footer sticky bottom space */}
      <footer className="footer bg-white border-t border-slate-200 p-4 text-center text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">
        SportTrack &bull; JWT Protected
      </footer>
    </div>
  );
};
