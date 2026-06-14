import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { LogIn, Key, Mail, ShieldAlert, ArrowLeft, Lock, CheckCircle2, Send } from "lucide-react";
import { API_BASE_URL } from "../config";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  
  // View states: 'login' | 'forgot' | 'reset'
  const [mode, setMode] = useState<"login" | "forgot" | "reset">("login");
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Reset password states
  const [resetEmail, setResetEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Status states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Normal login submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Invalid credentials. Please try again.");
    }
  };

  // Step 1: Request OTP
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Please enter your registered email address.");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send OTP.");
      }

      setSuccess(data.message || "If the account exists, an OTP has been sent.");
      // Move to step 2: verification & reset
      setMode("reset");
    } catch (err: any) {
      setError(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          otp: otp.trim(),
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      // Clear forms
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setEmail(resetEmail); // Prefill login email
      setSuccess("Your password has been reset successfully! Please log in below.");
      setMode("login");
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const enterForgotMode = () => {
    setError(null);
    setSuccess(null);
    setResetEmail(email); // Copy typed email if any
    setMode("forgot");
  };

  const enterLoginMode = () => {
    setError(null);
    setSuccess(null);
    setMode("login");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between px-4 py-8 font-sans">
      {/* Spacer Header */}
      <div className="text-center pt-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-600/30 mb-3">
          <Key className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">SportTrack <span className="text-blue-600">MERN</span></h1>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Hostel Sports Management</p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-sm mx-auto my-auto bg-white rounded-3xl border border-slate-200 p-6 shadow-xl relative">
        {mode === "login" && (
          <>
            <h2 id="login_card_title" className="text-lg font-bold text-slate-800 mb-6 text-center tracking-tight">Sign In</h2>

            {success && (
              <div id="login_success_alert" className="mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div id="login_error_alert" className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">EMAIL ADDRESS</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="login_email"
                    type="email"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 text-slate-900 transition-all font-medium leading-normal block"
                    placeholder="student@hostel.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">PASSWORD</label>
                  <button
                    id="goto_forgot_btn"
                    type="button"
                    onClick={enterForgotMode}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 tracking-wide uppercase focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    id="login_password"
                    type="password"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 text-slate-900 transition-all font-medium leading-normal block"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button
                id="login_btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:transform active:scale-[0.98] text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Login</span>
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {mode === "forgot" && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <button
                id="back_to_login_icon_btn"
                onClick={enterLoginMode}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                type="button"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 id="forgot_card_title" className="text-lg font-bold text-slate-800 tracking-tight">Forgot Password</h2>
            </div>

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Enter your registered application email address below, and we will send you a secure 6-digit verification code to reset your password.
            </p>

            {error && (
              <div id="forgot_error_alert" className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">REGISTERED EMAIL</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="forgot_email"
                    type="email"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 text-slate-900 transition-all font-medium leading-normal block"
                    placeholder="student@hostel.edu"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  id="send_otp_btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:transform active:scale-[0.98] text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send OTP Code</span>
                    </>
                  )}
                </button>

                <button
                  id="cancel_forgot_btn"
                  type="button"
                  onClick={enterLoginMode}
                  className="w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold uppercase tracking-wide tracking-tight"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          </>
        )}

        {mode === "reset" && (
          <>
            <h2 id="reset_card_title" className="text-lg font-bold text-slate-800 mb-2 tracking-tight">Reset Password</h2>
            
            {success && (
              <div id="reset_success_alert" className="mb-4 p-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center gap-2 font-medium leading-relaxed">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div id="reset_error_alert" className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs flex items-center gap-2 font-medium">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">6-DIGIT OTP CODE</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Key className="w-4 h-4" />
                  </span>
                  <input
                    id="reset_otp"
                    type="text"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 text-slate-900 transition-all font-mono font-bold tracking-widest block"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">NEW PASSWORD</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="reset_new_password"
                    type="password"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 text-slate-900 transition-all font-medium leading-normal block"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">CONFIRM NEW PASSWORD</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="reset_confirm_password"
                    type="password"
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 text-slate-900 transition-all font-medium leading-normal block"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  id="submit_reset_btn"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-650 bg-blue-600 hover:bg-blue-700 active:transform active:scale-[0.98] text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>

                <button
                  id="back_to_forgot_btn"
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setMode("forgot");
                  }}
                  className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold uppercase tracking-tight"
                >
                  Change Email / Resend OTP
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Footer credits */}
      <div className="text-center pb-4 text-[10px] font-bold text-slate-400 tracking-wider font-mono">
        <p className="mt-1 font-medium text-slate-400">SportTrack &copy; 2026</p>
      </div>
    </div>
  );
};
