import React, { useState, useEffect, useRef } from "react";
import { X, Send, Copy, ClipboardCheck, Trash2, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

const SUGGESTIONS = [
  "Cricket Rules",
  "Badminton Rules",
  "Football Rules",
  "Tennis Scoring",
  "Volleyball Rules",
];

export const AIChatModal: React.FC<AIChatModalProps> = ({ isOpen, onClose }) => {
  const { isAuthenticated, user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Manage automatic deletion of AI history when app window or tab is closed
  useEffect(() => {
    const handleUnloadCleanup = () => {
      const token = localStorage.getItem("token");
      if (token) {
        // Run standard fetch with keepalive: true to communicate database cleanup to the backend on tab closure
        fetch("/api/ai/history", {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          },
          keepalive: true
        }).catch(() => {});
      }
    };

    window.addEventListener("beforeunload", handleUnloadCleanup);
    window.addEventListener("unload", handleUnloadCleanup);

    return () => {
      window.removeEventListener("beforeunload", handleUnloadCleanup);
      window.removeEventListener("unload", handleUnloadCleanup);
    };
  }, []);

  // Load chat history from server on mount/open
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadHistory();
    }
  }, [isOpen, isAuthenticated]);

  // Scroll to bottom whenever messages list grows
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, sending]);

  const loadHistory = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      // Session based check: if this is a fresh reload/boot of the tab, clear any leftover database chats
      const sessionActiveFlag = sessionStorage.getItem("sport_track_ai_session_active");
      if (!sessionActiveFlag) {
        await api.clearAIChatHistory();
        sessionStorage.setItem("sport_track_ai_session_active", "true");
        setMessages([]);
        setLoading(false);
        return;
      }

      const history = await api.getAIChatHistory();
      // Map API history items with userId, question, answer to local layout messages
      const formatted: ChatMessage[] = [];
      history.forEach((h: any) => {
        formatted.push({
          id: h.id + "_q",
          sender: "user",
          text: h.question,
          timestamp: h.timestamp,
        });
        formatted.push({
          id: h.id + "_a",
          sender: "ai",
          text: h.answer,
          timestamp: h.timestamp,
        });
      });
      setMessages(formatted);
    } catch (err: any) {
      console.error("Failed to load search and chat history:", err);
      setErrorMsg("Unable to retrieve previous conversations.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || sending) return;

    setErrorMsg("");
    setSending(true);

    const userMsgId = "msg_user_" + Date.now();
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toISOString(),
    };

    // Stagger user message update first
    setMessages((prev) => [...prev, newUserMsg]);
    setInput("");

    try {
      const res = await api.sendAIChatMessage(textToSend.trim());
      
      const newAiMsg: ChatMessage = {
        id: res.chat?.id || "msg_ai_" + Date.now(),
        sender: "ai",
        text: res.answer,
        timestamp: res.chat?.timestamp || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newAiMsg]);
    } catch (err: any) {
      console.error("AI chat communication failed:", err);
      setErrorMsg(err.message || "An unexpected error occurred during AI reasoning.");
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to delete all your AI chat history? This action is permanent.")) return;
    
    setErrorMsg("");
    try {
      await api.clearAIChatHistory();
      setMessages([]);
    } catch (err: any) {
      console.error("AI clear chat history failed:", err);
      setErrorMsg("Failed to clear historical discussions.");
    }
  };

  const copyToClipboard = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const parseBold = (text: string): React.ReactNode[] => {
    // Strip backticks or raw hashes that might bubble up in normal line splits
    const cleanText = text.replace(/`/g, "");
    const parts = cleanText.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderMessageContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      let content: React.ReactNode = line;

      // Filter out markdown headers completely and style them beautifully (removes hashtag symbols)
      if (trimmed.startsWith("#")) {
        const match = trimmed.match(/^(#+)\s+(.*)$/);
        if (match) {
          const depth = match[1].length;
          const headerText = match[2];
          if (depth === 1) {
            content = <h1 className="text-base font-bold text-emerald-800 mt-2 mb-1.5 block">{parseBold(headerText)}</h1>;
          } else if (depth === 2) {
            content = <h2 className="text-sm font-semibold text-emerald-800 mt-2 mb-1 block">{parseBold(headerText)}</h2>;
          } else {
            content = <h3 className="text-xs font-semibold text-slate-800 mt-1.5 mb-0.5 block">{parseBold(headerText)}</h3>;
          }
          return <React.Fragment key={idx}>{content}</React.Fragment>;
        }
      }

      // Check for bullet list syntax (* or -)
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const match = line.match(/^[\s]*[\*-]\s+(.*)$/);
        if (match) {
          content = <li className="list-disc ml-4 my-1 text-slate-700 text-xs leading-relaxed">{parseBold(match[1])}</li>;
        }
      } else if (/^\d+\.\s+/.test(trimmed)) {
        // Numbered list checker (e.g. 1. Cricket rules)
        const match = line.match(/^[\s]*(\d+\.)\s+(.*)$/);
        if (match) {
          content = (
            <div className="flex items-start space-x-1.5 ml-1.5 my-1">
              <span className="font-bold text-emerald-600 text-xs shrink-0 select-none min-w-[1rem]">{match[1]}</span>
              <p className="text-slate-700 text-xs leading-relaxed">{parseBold(match[2])}</p>
            </div>
          );
        }
      } else if (!trimmed) {
        content = <div className="h-1.5" />;
      } else {
        content = <p className="mb-1 leading-relaxed text-slate-700 text-xs">{parseBold(line)}</p>;
      }

      return <React.Fragment key={idx}>{content}</React.Fragment>;
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        id="ai-chat-modal-overlay"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-end justify-end md:items-center md:justify-center p-0 md:p-4"
        onClick={onClose}
      >
        <motion.div
          id="ai-chat-card-container"
          initial={{ y: "100%", opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0.8 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="bg-white w-full md:max-w-md h-[85vh] md:h-[600px] rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Block */}
          <div id="ai-chat-header" className="bg-emerald-600 px-4 py-3.5 flex items-center justify-between text-white shadow-sm">
            <div className="flex items-center space-x-2.5">
              <span className="text-xl" role="img" aria-label="badge">🏅</span>
              <div>
                <h3 className="font-semibold text-base leading-tight">Sports Assistant</h3>
                <p className="text-[11px] text-emerald-100">AI rules & general gameplay instructions</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1.5">
              {messages.length > 0 && (
                <button
                  id="clear-history-ai-btn"
                  onClick={handleClearHistory}
                  className="p-1.5 rounded-lg hover:bg-emerald-700/80 transition-colors text-emerald-100 hover:text-white"
                  title="Clear chat records"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button
                id="close-ai-chat-btn"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-emerald-700/80 transition-colors text-emerald-100 hover:text-white"
                title="Minimize chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div id="ai-chat-error-banner" className="bg-rose-50 border-b border-rose-100 px-4 py-2 flex items-center space-x-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1 font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Messages Area */}
          <div 
            id="ai-chat-scroll-frame"
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50"
          >
            {messages.length === 0 && !loading && (
              <div id="ai-chat-empty-view" className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="p-3.5 bg-emerald-50 rounded-full text-emerald-600">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Ask anything about hostel sports</h4>
                  <p className="text-slate-500 text-xs mt-1 max-w-[280px]">
                    I can explain rules, score systems, equipment lists, field measurements and tournament metrics.
                  </p>
                </div>
              </div>
            )}

            {loading ? (
              <div id="ai-chat-loading" className="h-full flex flex-col items-center justify-center space-y-2.5 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-xs font-semibold text-slate-400">Recalling previous memories...</span>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-end space-x-1.5 max-w-[85%] group">
                    {msg.sender === "ai" && (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs shrink-0 select-none font-bold text-emerald-700 mb-0.5">
                        Ai
                      </div>
                    )}
                    <div
                      className={`px-3 py-2 rounded-2xl relative shadow-sm border ${
                        msg.sender === "user"
                          ? "bg-emerald-600 text-white rounded-br-none border-emerald-600"
                          : "bg-white text-slate-800 rounded-bl-none border-slate-100"
                      }`}
                    >
                      <div className="whitespace-pre-line text-sm leading-relaxed">
                        {msg.sender === "user" ? msg.text : renderMessageContent(msg.text)}
                      </div>
                      
                      {msg.sender === "ai" && (
                        <button
                          id={`copy-btn-${msg.id}`}
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="absolute -right-7 bottom-0.5 p-1 rounded bg-slate-100 text-slate-500 hover:text-emerald-600 border border-slate-200 shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          title="Copy Answer"
                        >
                          {copiedId === msg.id ? (
                            <ClipboardCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 mx-1.5">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}

            {sending && (
              <div id="ai-chat-typing-indicator" className="flex items-end space-x-1.5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs shrink-0 font-bold text-emerald-700">
                  Ai
                </div>
                <div className="bg-white border border-slate-100 px-4 py-2.5 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div id="ai-chat-quick-suggestions" className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center space-x-2 overflow-x-auto scrollbar-none shrink-0">
            {SUGGESTIONS.map((chip) => (
              <button
                key={chip}
                id={`ai-suggestion-chip-${chip.replace(/\s+/g, "-").toLowerCase()}`}
                disabled={sending || loading}
                onClick={() => handleSendMessage(chip)}
                className="py-1 px-3 text-xs bg-white text-slate-700 border border-slate-200 rounded-full hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition flex items-center space-x-1 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                <span>{chip}</span>
              </button>
            ))}
          </div>

          {/* Form Input Area */}
          <form
            id="ai-chat-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="p-3 border-t border-slate-100 bg-white flex items-center space-x-2"
          >
            <input
              id="ai-chat-text-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending || loading}
              placeholder="Ask anything about hostel sports..."
              className="flex-1 bg-slate-50 px-3.5 py-2 text-slate-800 placeholder-slate-400 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-5050 border border-slate-200 disabled:opacity-75 focus:border-emerald-500"
            />
            <button
              id="ai-chat-send-btn"
              type="submit"
              disabled={!input.trim() || sending || loading}
              className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shrink-0 cursor-pointer shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
