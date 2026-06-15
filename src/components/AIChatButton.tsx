import React, { useState } from "react";
import { AIChatModal } from "./AIChatModal";
import { useAuth } from "../context/AuthContext";
import { MessageSquare, Sparkles } from "lucide-react";

export const AIChatButton: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Strictly require authenticated session to restrict Gemini operations
  if (!isAuthenticated) return null;

  return (
    <>
      <div 
        id="ai-floating-assistant-wrapper"
        className="fixed bottom-6 right-6 z-[990] select-none"
      >
        <button
          id="ai-floating-assistant-trigger"
          onClick={() => setIsOpen(true)}
          className="relative flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium text-sm py-3 px-4.5 rounded-full shadow-lg hover:shadow-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 md:scale-100 hover:scale-105 active:scale-95 touch-none shrink-0"
          title="Open AI sports assistant"
        >
          {/* Sparkles effect indicator */}
          <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse shrink-0" />
          <span className="flex items-center space-x-1">
            <span>🏅</span>
            <span className="tracking-tight font-semibold">Ask AI</span>
          </span>
          
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        </button>
      </div>

      <AIChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
