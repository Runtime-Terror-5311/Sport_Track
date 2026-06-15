import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { User, Equipment, Issue } from "../types";
import {
  LogOut,
  Users,
  Search,
  BookOpen,
  Calendar,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  Send,
  RefreshCw,
  AlertCircle,
  Dribbble,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  FileSpreadsheet
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  // Selected Tab state
  const [activeTab, setActiveTab] = useState<"users" | "issues" | "reports">("issues");

  // --- Monthly Report Tab states ---
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1); // 1-indexed
  const [reportData, setReportData] = useState<any | null>(null);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const [recipientEmail, setRecipientEmail] = useState<string>("shubhangi0100@gmail.com");
  const [dispatchLoading, setDispatchLoading] = useState<boolean>(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  // Domain states
  const [students, setStudents] = useState<User[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [activeIssues, setActiveIssues] = useState<Issue[]>([]);

  // Loading & Filter states
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Forms state
  // 1. Issue equipment form
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>("");
  const [issueQuantity, setIssueQuantity] = useState<number>(1);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueSuccess, setIssueSuccess] = useState<boolean>(false);

  // 2. Add / Edit equipment form
  const [showEqForm, setShowEqForm] = useState<boolean>(false);
  const [editingEqId, setEditingEqId] = useState<string | null>(null);
  const [eqName, setEqName] = useState<string>("");
  const [eqTotalQty, setEqTotalQty] = useState<number>(1);
  const [eqAvailableQty, setEqAvailableQty] = useState<number>(1); // Only for editing if needed
  const [eqError, setEqError] = useState<string | null>(null);

  // Non-blocking in-app confirmation overlays for critical actions
  const [confirmingIssueId, setConfirmingIssueId] = useState<string | null>(null);
  const [pendingDeleteEqId, setPendingDeleteEqId] = useState<string | null>(null);
  const [pendingDeleteStudentId, setPendingDeleteStudentId] = useState<string | null>(null);

  // Excel Import states
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [importLoading, setImportLoading] = useState<boolean>(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    totalRows: number;
    imported: number;
    duplicates: number;
    errors: number;
  } | null>(null);
  const [errorReportCsv, setErrorReportCsv] = useState<string | null>(null);

  // Manual Single Student creation form state
  const [manualStudentTab, setManualStudentTab] = useState<"import" | "manual">("import");
  const [mName, setMName] = useState<string>("");
  const [mEmail, setMEmail] = useState<string>("");
  const [mHostel, setMHostel] = useState<string>("M");
  const [mRoomNumber, setMRoomNumber] = useState<string>("");
  const [mPhone, setMPhone] = useState<string>("");
  const [mRegNo, setMRegNo] = useState<string>("");
  const [manualStudentLoading, setManualStudentLoading] = useState<boolean>(false);
  const [manualStudentError, setManualStudentError] = useState<string | null>(null);
  const [manualStudentSuccess, setManualStudentSuccess] = useState<string | null>(null);

  // Room Search for student select states
  const [studentSelectionMode, setStudentSelectionMode] = useState<"list" | "room">("list");
  const [roomSearchQuery, setRoomSearchQuery] = useState<string>("");
  const [roomSearchResult, setRoomSearchResult] = useState<User | null>(null);
  const [roomSearchError, setRoomSearchError] = useState<string | null>(null);
  const [isSearchingRoom, setIsSearchingRoom] = useState<boolean>(false);

  // Load all foundational data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setErrorCode(null);

      // Fetch in parallel
      const [allEquip, allIssues, allStuds] = await Promise.all([
        api.getEquipment(),
        api.getActiveIssues(),
        api.getStudents(searchQuery),
      ]);

      setEquipmentList(allEquip);
      setActiveIssues(allIssues);
      setStudents(allStuds);
    } catch (err: any) {
      setErrorCode(err.message || "Failed to load admin logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyReport = async (y: number, m: number) => {
    try {
      setReportLoading(true);
      setReportError(null);
      setDispatchSuccess(null);
      setDispatchError(null);

      const response = await api.getMonthlyReport(y, m);
      setReportData(response);
    } catch (err: any) {
      setReportError(err.message || "Failed to fetch monthly report metrics.");
    } finally {
      setReportLoading(false);
    }
  };

  const handleDispatchAndPurge = async () => {
    try {
      setDispatchLoading(true);
      setDispatchError(null);
      setDispatchSuccess(null);

      const response = await api.dispatchAndPurgeReport(reportYear, reportMonth, recipientEmail);
      setDispatchSuccess(response.message || "Report successfully emailed, and completed records cleared!");

      // Refresh report data
      await fetchMonthlyReport(reportYear, reportMonth);
      // Also reload background data to update Active lists since completed records were deleted
      await loadInitialData();
    } catch (err: any) {
      setDispatchError(err.message || "Failed to execute report dispatch and database purge.");
    } finally {
      setDispatchLoading(false);
    }
  };

  // Run on first load & when search changes
  useEffect(() => {
    loadInitialData();
  }, [searchQuery]);

  // Load report data dynamically when reports tab is active or period changes
  useEffect(() => {
    if (activeTab === "reports") {
      fetchMonthlyReport(reportYear, reportMonth);
    }
  }, [activeTab, reportYear, reportMonth]);

  // Handle equipment checkout to student
  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueError(null);
    setIssueSuccess(false);

    if (!selectedStudentId || !selectedEquipmentId || issueQuantity <= 0) {
      setIssueError("Please select a student, equipment, and positive quantity.");
      return;
    }

    try {
      await api.issueEquipment(selectedStudentId, selectedEquipmentId, issueQuantity);
      setIssueSuccess(true);
      // Reset issue inputs
      setSelectedStudentId("");
      setSelectedEquipmentId("");
      setIssueQuantity(1);
      // Reload lists
      await loadInitialData();
    } catch (err: any) {
      setIssueError(err.message || "Checkout transaction rejected.");
    }
  };

  // Confirm student return request
  const handleConfirmReturn = async (issueId: string) => {
    try {
      await api.confirmReturn(issueId);
      await loadInitialData();
      setConfirmingIssueId(null);
    } catch (err: any) {
      setErrorCode(err.message || "Error confirming return");
    }
  };

  // Add / Edit Inventory Equipment
  const handleEquipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEqError(null);

    if (!eqName.trim() || eqTotalQty < 0) {
      setEqError("Invalid name or negative quantities.");
      return;
    }

    try {
      if (editingEqId) {
        // Edit active equipment
        await api.editEquipment(editingEqId, {
          name: eqName,
          totalQuantity: eqTotalQty,
          availableQuantity: eqAvailableQty,
        });
      } else {
        // Create new equipment type
        await api.addEquipment(eqName, eqTotalQty);
      }

      // Reset
      setEqName("");
      setEqTotalQty(1);
      setEqAvailableQty(1);
      setEditingEqId(null);
      setShowEqForm(false);
      await loadInitialData();
    } catch (err: any) {
      setEqError(err.message || "Error managing inventories.");
    }
  };

  // delete equipment
  const handleDeleteEquipment = async (eqId: string) => {
    try {
      await api.deleteEquipment(eqId);
      await loadInitialData();
      setPendingDeleteEqId(null);
    } catch (err: any) {
      setErrorCode(err.message || "Could not delete equipment.");
    }
  };

  // delete student profile
  const handleDeleteStudent = async (studentId: string) => {
    try {
      await api.deleteStudent(studentId);
      await loadInitialData();
      setPendingDeleteStudentId(null);
    } catch (err: any) {
      setErrorCode(err.message || "Could not delete student profile.");
      setPendingDeleteStudentId(null);
    }
  };

  const handleManualStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualStudentError(null);
    setManualStudentSuccess(null);

    if (!mName.trim() || !mEmail.trim() || !mHostel.trim() || !mRoomNumber.trim()) {
      setManualStudentError("Please fill out all required fields: Name, Email, Hostel, and Room Number.");
      return;
    }

    try {
      setManualStudentLoading(true);
      const res = await api.addStudent({
        name: mName.trim(),
        email: mEmail.trim(),
        hostel: mHostel.trim(),
        roomNumber: mRoomNumber.trim(),
        phone: mPhone.trim() || undefined,
        regNo: mRegNo.trim() || undefined,
      });

      setManualStudentSuccess(`Successfully registered student ${res.student?.name || mName}! Room ${res.student?.roomNumber || mRoomNumber}.`);
      
      // Reset manual fields
      setMName("");
      setMEmail("");
      setMHostel("M");
      setMRoomNumber("");
      setMPhone("");
      setMRegNo("");

      // Trigger hot reload of directory list
      await loadInitialData();
    } catch (err: any) {
      setManualStudentError(err.message || "Failed to register student profile.");
    } finally {
      setManualStudentLoading(false);
    }
  };

  // Fill in active equipment into edits form
  const startEditEquipment = (item: Equipment) => {
    setEditingEqId(item.id);
    setEqName(item.name);
    setEqTotalQty(item.totalQuantity);
    setEqAvailableQty(item.availableQuantity);
    setShowEqForm(true);
  };

  const cancelEquipmentEdit = () => {
    setEditingEqId(null);
    setEqName("");
    setEqTotalQty(1);
    setEqAvailableQty(1);
    setShowEqForm(false);
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

  // Status and Room Search handler to assign students
  const handleRoomSearch = async (roomNumber: string) => {
    setRoomSearchQuery(roomNumber);
    const trimmed = roomNumber.trim();
    if (!trimmed) {
      setRoomSearchResult(null);
      setRoomSearchError(null);
      setSelectedStudentId("");
      return;
    }

    setIsSearchingRoom(true);
    setRoomSearchError(null);
    try {
      const result = await api.getStudentByRoom(trimmed);
      setRoomSearchResult(result);
      setSelectedStudentId(result.id);
    } catch (err: any) {
      setRoomSearchResult(null);
      setSelectedStudentId("");
      setRoomSearchError(err.message || "Room not found or no student assigned.");
    } finally {
       setIsSearchingRoom(false);
    }
  };

  // Student Excel Import Actions
  const handleImportSubmit = async (fileToUpload: File) => {
    setImportError(null);
    setImportSummary(null);
    setErrorReportCsv(null);
    setImportLoading(true);

    try {
      const data = await api.importStudents(fileToUpload);
      setImportSummary(data.summary);
      setErrorReportCsv(data.errorReportCsv);
      setImportFile(null);
      await loadInitialData();
    } catch (err: any) {
      setImportError(err.message || "Failed to process import file.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "csv") {
        setImportFile(file);
        handleImportSubmit(file);
      } else {
        setImportError("Please upload a valid .xlsx or .csv Excel-compatible file.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImportFile(file);
      handleImportSubmit(file);
    }
  };

  const downloadCsvReport = () => {
    if (!errorReportCsv) return;
    const blob = new Blob([errorReportCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between max-w-lg mx-auto relative border-x border-slate-200 shadow-2xl font-sans">
      <div>
        {/* Header */}
        <header className="sticky top-0 bg-white border-b border-rose-250 border-slate-200 px-6 py-4 z-10 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black tracking-widest uppercase bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200">
                Sports Registry
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 mt-2 tracking-tight">
                {user?.name || "Sports Secretary"}
              </h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono">Hostel Secretary Admin</p>
            </div>
            <button
              onClick={logout}
              className="p-2.5 hover:bg-slate-100 text-slate-600 hover:text-red-650 rounded-xl transition duration-150 border border-slate-200 cursor-pointer"
              title="Logout"
              id="admin_logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Dynamic Dual Tab Selector (Required spec: TAB 1: USERS, TAB 2: ISSUED EQUIPMENT) */}
        <div className="bg-slate-100 border-b border-slate-200 p-2 flex gap-1 font-sans">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "users"
                ? "bg-slate-800 text-white shadow-md shadow-slate-900/10"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>STUDENTS</span>
          </button>
          <button
            onClick={() => setActiveTab("issues")}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "issues"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>LOANS</span>
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === "reports"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>MONTHLY REPORT</span>
          </button>
        </div>

        {/* Global state notification */}
        <div className="p-4">
          {errorCode && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorCode}</span>
            </div>
          )}

          {/* TAB 1: USERS (Student Directory with search) */}
          {activeTab === "users" && (
            <div className="space-y-4">
              {/* Student Profiles Panel (Import or Manual Single) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      Add Student Profiles
                    </h3>
                  </div>

                  {/* Tablet and Desktop Pill Toggle Selector */}
                  <div className="bg-slate-100 p-1 rounded-xl flex gap-1 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setManualStudentTab("import")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer ${
                        manualStudentTab === "import"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Bulk Spreadsheet
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualStudentTab("manual")}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide transition-all cursor-pointer ${
                        manualStudentTab === "manual"
                          ? "bg-white text-slate-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Single Manual
                    </button>
                  </div>
                </div>

                {manualStudentTab === "import" && (
                  <>
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 text-[10px] text-slate-600 leading-relaxed space-y-1">
                      <p className="font-bold text-emerald-800">Spreadsheet Specifications:</p>
                      <p>Required columns (exact names): <span className="font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-100">name</span>, <span className="font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-100">email</span>, <span className="font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-100">hostel</span>, <span className="font-mono text-emerald-700 bg-white px-1.5 py-0.5 rounded border border-emerald-100">roomNumber</span>.</p>
                      <p>Optional columns: <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-100">phone</span>, <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-100">regNo</span>.</p>
                      <p>Hostel M operates on <span className="font-semibold text-emerald-800">single-occupancy</span> (any duplicate room number blocks insertion).</p>
                    </div>

                    {importError && (
                      <div className="p-3 bg-red-50 border border-red-250 rounded-2xl text-[10px] font-semibold text-red-700 flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{importError}</span>
                      </div>
                    )}

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[110px] ${
                        isDragging
                          ? "border-blue-600 bg-blue-50/50"
                          : "border-slate-200 hover:border-slate-350 hover:bg-slate-50/40"
                      }`}
                      onClick={() => document.getElementById("excel_import_file")?.click()}
                    >
                      <input
                        id="excel_import_file"
                        type="file"
                        accept=".xlsx, .csv"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      {importLoading ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="inline-block w-6 h-6 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"></span>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Processing Spreadsheet...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5">
                          <UploadCloud className="w-7 h-7 text-slate-400 mb-1" />
                          <p className="text-xs font-bold text-slate-700">
                            {importFile ? importFile.name : "Upload Excel or CSV Sheet"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Drag & drop file here, or <span className="text-blue-600 underline font-bold">browse local files</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Import Summary Results */}
                    {importSummary && (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs">
                        <div className="flex justify-between border-b border-slate-200 pb-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Import Results</span>
                          <span>{importSummary.totalRows} Processed</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-extrabold font-sans">
                          <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-100 flex flex-col justify-center items-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
                            <span className="text-sm font-black">{importSummary.imported}</span>
                            <span className="text-[8px] font-bold text-emerald-650 uppercase tracking-widest mt-1">Imported</span>
                          </div>
                          <div className="bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-100 flex flex-col justify-center items-center">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mb-1" />
                            <span className="text-sm font-black">{importSummary.duplicates}</span>
                            <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest mt-1">Duplicates</span>
                          </div>
                          <div className="bg-red-50 text-red-800 p-2.5 rounded-xl border border-red-100 flex flex-col justify-center items-center">
                            <XCircle className="w-4 h-4 text-red-650 mb-1" />
                            <span className="text-sm font-black">{importSummary.errors}</span>
                            <span className="text-[8px] font-bold text-red-600 uppercase tracking-widest mt-1">Errors</span>
                          </div>
                        </div>

                        {/* Downloadable Error Report button */}
                        {errorReportCsv && (importSummary.errors > 0 || importSummary.duplicates > 0) && (
                          <button
                            onClick={downloadCsvReport}
                            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Import Report (CSV)</span>
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}

                {manualStudentTab === "manual" && (
                  <form onSubmit={handleManualStudentSubmit} className="space-y-4">
                    {/* Feedback messages */}
                    {manualStudentError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{manualStudentError}</span>
                      </div>
                    )}
                    {manualStudentSuccess && (
                      <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>{manualStudentSuccess}</span>
                      </div>
                    )}

                    {/* Form Input fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Name */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Student Name <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          id="manual_field_name"
                          type="text"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                          placeholder="e.g. Rahul Kumar"
                          value={mName}
                          onChange={(e) => setMName(e.target.value)}
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Email Address <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          id="manual_field_email"
                          type="email"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                          placeholder="e.g. rahul@hospital.com"
                          value={mEmail}
                          onChange={(e) => setMEmail(e.target.value)}
                        />
                      </div>

                      {/* Hostel Selection */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Hostel Block <span className="text-red-500 font-bold">*</span>
                        </label>
                        <select
                          id="manual_field_hostel"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                          value={mHostel}
                          onChange={(e) => setMHostel(e.target.value)}
                        >
                          <option value="M">Hostel M</option>
                          <option value="A">Hostel A</option>
                          <option value="B">Hostel B</option>
                          <option value="C">Hostel C</option>
                        </select>
                      </div>

                      {/* Room Number */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Room Number <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          id="manual_field_room"
                          type="text"
                          required
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                          placeholder="e.g. 104"
                          value={mRoomNumber}
                          onChange={(e) => setMRoomNumber(e.target.value)}
                        />
                      </div>

                      {/* Phone (Optional) */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Phone Number (Optional)
                        </label>
                        <input
                          id="manual_field_phone"
                          type="tel"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                          placeholder="e.g. +91 94450 12345"
                          value={mPhone}
                          onChange={(e) => setMPhone(e.target.value)}
                        />
                      </div>

                      {/* Registration No (Optional) */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Reg No (Optional - Auto-gen if empty)
                        </label>
                        <input
                          id="manual_field_reg"
                          type="text"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                          placeholder="e.g. 2026CSE045"
                          value={mRegNo}
                          onChange={(e) => setMRegNo(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Submit action */}
                    <div className="flex justify-end pt-2">
                      <button
                        id="manual_student_submit_btn"
                        type="submit"
                        disabled={manualStudentLoading}
                        className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        {manualStudentLoading ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Adding student...</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-3.5 h-3.5" />
                            <span>Add Student Profile</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Search Block */}
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  id="admin_student_search"
                  type="text"
                  className="w-full pl-10 pr-3 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-605 text-slate-800 font-medium shadow-sm"
                  placeholder="Filter student profiles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Student Cards (Display all students: Columns: Name, Email, Hostel, Room Number) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Student Credentials</span>
                  <span>Quarter Info</span>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <span className="inline-block w-6 h-6 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"></span>
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-8 bg-white border border-dashed border-slate-200 rounded-2xl p-4 text-xs text-slate-500">
                    No student profiles matched your query.
                  </div>
                ) : (
                  students.map((student) => (
                    <div
                      key={student.id}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition flex justify-between items-center"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{student.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 tracking-tight font-mono">{student.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-[11px] font-mono">
                          <span className="font-bold text-slate-700">{student.hostel}</span>
                          <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-bold">ROOM {student.roomNumber}</p>
                        </div>
                        <button
                          onClick={() => setPendingDeleteStudentId(student.id)}
                          className="p-1 px-1.5 bg-red-50 hover:bg-red-100/80 text-red-650 hover:text-red-700 rounded-lg transition-colors border border-red-100/50 cursor-pointer"
                          title="Delete Student Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ISSUED EQUIPMENT (Lists Checkouts + Issue Action + Catalog Admin) */}
          {activeTab === "issues" && (
            <div className="space-y-6 animate-fade">
              
              {/* COMPONENT 1: ISSUE EQUIPMENT FLOW */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-1.5 mb-3 border-b border-slate-100 pb-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                    Checkout Registry Transaction
                  </h3>
                </div>

                {issueError && (
                  <div className="mb-3 p-2.5 bg-red-50 border border-red-200 text-red-650 text-[10px] rounded-xl font-medium">
                    {issueError}
                  </div>
                )}
                {issueSuccess && (
                  <div className="mb-3 p-2.5 bg-green-50 border border-green-200 text-green-700 text-[10px] rounded-xl font-bold">
                    Equipment Checked Out Successfully!
                  </div>
                )}

                <form onSubmit={handleIssueSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student Selection */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        1. Assign Student (Search Room or Select)
                      </label>
                      
                      {/* Room Search Option */}
                      <div className="mb-2 relative">
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/15 font-mono"
                          placeholder="Search Room (e.g. 104)..."
                          value={roomSearchQuery}
                          onChange={(e) => handleRoomSearch(e.target.value)}
                        />
                        {isSearchingRoom && (
                          <span className="absolute right-3 top-3 w-3 h-3 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></span>
                        )}
                      </div>

                      {/* If roomSearchQuery has a found student, we show the auto-fetched name from the database */}
                      {roomSearchResult ? (
                        <div className="mb-2 p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 font-medium">
                          ✓ Fetched Name: <span className="font-bold">{roomSearchResult.name}</span> (Room {roomSearchResult.roomNumber})
                        </div>
                      ) : roomSearchQuery && roomSearchError ? (
                        <div className="mb-2 p-2 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-600 font-medium">
                          ✗ {roomSearchError}
                        </div>
                      ) : null}

                      <select
                        id="issue_student_select"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                        value={selectedStudentId}
                        onChange={(e) => {
                          setSelectedStudentId(e.target.value);
                          const found = students.find(s => s.id === e.target.value);
                          if (found) {
                            setRoomSearchQuery(found.roomNumber || "");
                            setRoomSearchResult(found);
                            setRoomSearchError(null);
                          } else {
                            setRoomSearchQuery("");
                            setRoomSearchResult(null);
                          }
                        }}
                      >
                        <option value="">-- Choose Student Manually --</option>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Room {s.roomNumber})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Equipment Selection */}
                    <div className="flex flex-col justify-between">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                          2. Sports Equipment
                        </label>
                        <select
                          id="issue_equipment_select"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                          value={selectedEquipmentId}
                          onChange={(e) => setSelectedEquipmentId(e.target.value)}
                        >
                          <option value="">-- Select Gear / Sport Item --</option>
                          {equipmentList.map((e) => (
                            <option key={e.id} value={e.id} disabled={e.availableQuantity <= 0}>
                              {e.name} ({e.availableQuantity} / {e.totalQuantity} available)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Spacing alignment helper for desktop layout */}
                      <div className="hidden md:block h-3"></div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-end gap-3.5 pt-1">
                    <div className="w-full sm:w-1/3">
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        3. Issue Quantity
                      </label>
                      <input
                        id="issue_quantity_input"
                        type="number"
                        min="1"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                        value={issueQuantity}
                        onChange={(e) => setIssueQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <div className="w-full sm:w-2/3">
                      <button
                        id="issue_submit_btn"
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/25 transition cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Confirm Checkout</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* COMPONENT 2: ACTIVE CHECKOUT TRACKING TABLE/CARDS (Columns: Student, Gear, Date, Due Date, Status) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    ACTIVE ISSUED LOANS
                  </h3>
                </div>

                {loading ? (
                  <div className="text-center py-6">
                    <span className="inline-block w-6 h-6 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"></span>
                  </div>
                ) : activeIssues.length === 0 ? (
                  <div className="text-center py-8 bg-white border border-dashed border-slate-200 rounded-2xl p-4 text-xs text-slate-500">
                    No active issued equipment. (All gear is returned and accounted for)
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeIssues.map((issue) => {
                      const isOverdue = issue.status === "Overdue";
                      const isRequested = issue.status === "Return Requested";

                      return (
                        <div
                          key={issue.id}
                          className={`bg-white rounded-2xl border p-4 shadow-sm transition hover:shadow-md ${
                            isOverdue
                              ? "bg-red-50/20 border-red-200"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  {issue.studentName}
                                </span>
                                <span className="text-[9px] text-slate-550 text-slate-500 font-bold uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
                                  ROOM {issue.roomNumber} &bull; {issue.hostel}
                                </span>
                              </div>
                              <p className="text-xs font-extrabold text-blue-600 mt-1">
                                Issued: {issue.quantity}x {issue.equipmentName}
                              </p>
                            </div>

                            {/* Status Pill */}
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                isOverdue
                                  ? "bg-red-100 text-red-700 border-red-200 animate-pulse"
                                  : isRequested
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-green-100 text-green-700 border-green-200 font-bold uppercase"
                              }`}
                            >
                              {isRequested ? "PENDING RETURN" : issue.status}
                            </span>
                          </div>

                          {/* Date details */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold font-mono text-slate-400 pt-2 border-t border-slate-100">
                            <div>
                              <span>Out: {cleanDate(issue.issueDate)}</span>
                            </div>
                            <div className="text-right">
                              <span
                                className={`${
                                  isOverdue ? "text-red-600 font-bold" : ""
                                }`}
                              >
                                Due: {cleanDate(issue.dueDate)}
                              </span>
                            </div>
                          </div>

                          {/* Quick return confirmation button block */}
                          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={() => setConfirmingIssueId(issue.id)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                isRequested
                                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20"
                                  : "bg-slate-100 hover:bg-green-600 hover:text-white text-slate-700 border border-slate-200 hover:border-transparent"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isRequested ? "Accept Return Request" : "Confirm Hand-in"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* COMPONENT 3: EQUIPMENT MANAGEMENT */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-500" />
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      Equipment Management
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      if (showEqForm) cancelEquipmentEdit();
                      else setShowEqForm(true);
                    }}
                    className="p-1 px-2 text-[10px] font-bold bg-slate-50 border border-slate-200 hover:border-blue-500 text-blue-600 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showEqForm ? "Collapse" : "Add/Edit"}</span>
                  </button>
                </div>

                {showEqForm && (
                  <form onSubmit={handleEquipmentSubmit} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-[9px] font-bold text-slate-500 font-mono uppercase tracking-widest">
                      {editingEqId ? `Edit / Update Equipment` : `Add Brand New Equipment`}
                    </h4>

                    {eqError && (
                      <div className="p-2 bg-red-50 text-red-650 text-[10px] rounded-lg">
                        {eqError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Equipment Name</label>
                        <input
                          id="eq_name_input"
                          type="text"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600/10"
                          placeholder="e.g. Football"
                          value={eqName}
                          onChange={(e) => setEqName(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Qty</label>
                          <input
                            id="eq_total_input"
                            type="number"
                            min="0"
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 font-mono"
                            value={eqTotalQty}
                            onChange={(e) => setEqTotalQty(Math.max(0, parseInt(e.target.value) || 0))}
                          />
                        </div>
                        {editingEqId !== null && (
                          <div>
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Available Qty</label>
                            <input
                              id="eq_avail_input"
                              type="number"
                              min="0"
                              max={eqTotalQty}
                              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 font-mono"
                              value={eqAvailableQty}
                              onChange={(e) => setEqAvailableQty(Math.min(eqTotalQty, Math.max(0, parseInt(e.target.value) || 0)))}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={cancelEquipmentEdit}
                        className="py-1 px-3 bg-white border border-slate-200 text-slate-650 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="py-1 px-3 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 cursor-pointer"
                      >
                        Confirm
                      </button>
                    </div>
                  </form>
                )}

                {/* Grid inventory list with simple Edit / Delete buttons */}
                <div className="space-y-1.5 pr-0.5">
                  {equipmentList.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800">{item.name}</span>
                        <div className="text-[9px] font-mono font-bold text-slate-455 text-slate-400 mt-0.5 uppercase tracking-wide">
                          Total: {item.totalQuantity} &bull; Available: {item.availableQuantity}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditEquipment(item)}
                          className="p-1.5 hover:bg-blue-100 hover:text-blue-700 text-slate-400 rounded transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPendingDeleteEqId(item.id)}
                          className="p-1.5 hover:bg-red-100 hover:text-red-700 text-slate-400 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: REPORTS (Monthly Report and Purge) */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <h2 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">Period Filter Settings</h2>
                  </div>
                  <button
                    onClick={() => fetchMonthlyReport(reportYear, reportMonth)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer transition border-0 bg-transparent"
                    title="Refresh Report"
                    disabled={reportLoading}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reportLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Year</label>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {Array.from({ length: 6 }, (_, i) => 2024 + i).map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Month</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {[
                        "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                      ].map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Summary Metrics & Interactive Logs */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Metrics & transaction preview
                </h3>

                {reportLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                    <span className="text-xs text-slate-400 font-bold">Compiling monthly stats...</span>
                  </div>
                ) : reportError ? (
                  <div className="p-3 bg-red-50 border border-red-150 text-red-650 text-xs rounded-xl">
                    {reportError}
                  </div>
                ) : reportData ? (
                  <div className="space-y-4">
                    {/* Grid cards */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-center">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Completed Actions</span>
                        <span className="text-base font-black text-[#2563eb]">{reportData.items.length}</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 text-center">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Returned Quantity</span>
                        <span className="text-base font-black text-emerald-600">{reportData.totalReturned}</span>
                      </div>
                    </div>

                    {/* Report transaction logs list */}
                    <div className="space-y-2 pr-1">
                      {reportData.items.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 font-bold bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                          No transactions found for this period.
                        </div>
                      ) : (
                        reportData.items.map((item: any) => (
                          <div key={item.id} className="border border-slate-100 bg-slate-50/50 hover:bg-slate-100 rounded-2xl p-3 text-xs flex justify-between items-center transition">
                            <div className="space-y-0.5">
                              <span className="block font-bold text-slate-800">{item.studentName}</span>
                              <div className="text-[9px] font-bold text-slate-400">
                                Rm {item.roomNumber}, {item.hostel}
                              </div>
                              <span className="block text-[9px] text-slate-600 font-black mt-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 w-fit">
                                {item.equipmentName} ({item.quantity} pc)
                              </span>
                            </div>
                            <div className="text-right space-y-1">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                                item.status === "Returned"
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : item.status === "Overdue"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : "bg-amber-100 text-amber-700 border border-amber-200"
                              }`}>
                                {item.status}
                              </span>
                              <div className="text-[8px] font-mono font-medium text-slate-400">
                                {new Date(item.issueDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-250">
                    Choose year/month and click settings to inspect data.
                  </div>
                )}
              </div>

              {/* Archive, Send and Clean Up controls */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-emerald-150">
                  <Send className="w-4 h-4 text-emerald-600 animate-pulse" />
                  <h3 className="font-extrabold text-xs text-emerald-800 uppercase tracking-wider">
                    Archive & database cleanup service
                  </h3>
                </div>

                <p className="text-[10px] text-emerald-700 font-semibold leading-relaxed">
                  Automate the extraction and database housekeeping. Enter your administrator email below to send the monthly transaction PDF report and purge the completed returned items.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-black text-emerald-700 uppercase tracking-wider mb-1">
                      Recipient Email Destination:
                    </label>
                    <input
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full bg-white border border-emerald-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                      placeholder="e.g. shubhangi0100@gmail.com"
                    />
                  </div>

                  {dispatchError && (
                    <div className="p-3 bg-red-100 border border-red-200 text-red-700 text-xs rounded-xl">
                      {dispatchError}
                    </div>
                  )}

                  {dispatchSuccess && (
                     <div className="p-3 bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-1.5">
                       <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                       <span>{dispatchSuccess}</span>
                     </div>
                  )}

                  <button
                    onClick={handleDispatchAndPurge}
                    disabled={dispatchLoading || reportLoading || !reportData || reportData.items.length === 0}
                    type="button"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black tracking-widest uppercase rounded-xl transition shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer border-0"
                  >
                    {dispatchLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Mailing & Archiving...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Email PDF & Clear Completed Logs</span>
                      </>
                    )}
                  </button>

                  <div className="text-[8px] text-emerald-600 font-bold text-center leading-normal">
                    💡 Unreturned (Active, Overdue, or Requested) items will stay tracked in the active list. Only completed "Returned" logs will be deleted to keep database slim and clean.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return Confirmation Overlays */}
      {confirmingIssueId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl relative">
            <h3 className="font-extrabold text-base text-slate-900 tracking-tight">Confirm Return</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-5">
              Are you sure you want to verify and accept this equipment return? This will automatically restore the items back design-wise to current available inventory.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmingIssueId(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                No, Go Back
              </button>
              <button
                onClick={() => handleConfirmReturn(confirmingIssueId)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition cursor-pointer"
              >
                Accept Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Equipment Registry Overlays */}
      {pendingDeleteEqId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl relative">
            <h3 className="font-extrabold text-base text-red-600 tracking-tight">Remove Equipment?</h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-2 mb-5">
              Warning: This is an irreversible registry change. Are you sure you want to delete this equipment type and remove it permanently from log storage?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingDeleteEqId(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEquipment(pendingDeleteEqId)}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/25 transition cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Profile Overlays */}
      {pendingDeleteStudentId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl relative">
            <div className="flex items-center gap-2 mb-2 text-red-600">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-extrabold text-base tracking-tight">Delete Student Profile?</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Warning: This will permanently delete the student’s credentials and profile from the tracker. This operation is irreversible and can only be performed if the student has no active equipment loans.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingDeleteStudentId(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteStudent(pendingDeleteStudentId)}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/25 transition cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer bg-white border-t border-slate-200 p-4 text-center text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold">
        SportTrack &bull; JWT Protected ADMIN
      </footer>
    </div>
  );
};
