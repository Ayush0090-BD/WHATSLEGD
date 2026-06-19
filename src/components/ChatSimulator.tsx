import React, { useState } from "react";
import { MessageSquare, ArrowRight, Loader2, Sparkles, Send, Check, AlertCircle, RefreshCw } from "lucide-react";
import { ExtractionResult } from "../types";

interface Props {
  onEntryAdded: () => void;
}

const SAMPLE_MESSAGES = [
  "Done AC repair for Raju. Total ₹700. Paid ₹500. Remaining ₹200. Call him next week.",
  "Web design done for Sunita. Paid 1500 directly in account.",
  "Amit Sharma plumbing installation. Total 400. Paid nothing as of now. Follow up date June 21.",
  "Car service done for Vikram Singh, charged 1200 rupees. He gave 1000 cash. Left with 200. Call next Sunday.",
];

export default function ChatSimulator({ onEntryAdded }: Props) {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Holds the result of a successful extraction
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverSaved, setServerSaved] = useState(false);

  // Message logs within the session chat screen for visual identity
  const [chatLog, setChatLog] = useState<{ sender: "user" | "bot"; text: string; time: string }[]>([
    {
      sender: "bot",
      text: "Hello! Welcome to WhatsApp Ledger. Paste business update messages here (e.g. 'Done plumbing for John. Paid 100. Remaining 50. Call on Monday'), and I will convert them into professional ledger entries.",
      time: "11:11"
    }
  ]);

  const handleSampleClick = (sample: string) => {
    setInputText(sample);
    setError(null);
  };

  const handleExtract = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;

    setLoading(true);
    setError(null);
    setExtraction(null);
    setServerSaved(false);
    setIsSuccess(false);

    // Save user chat record
    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatLog(prev => [...prev, { sender: "user", text: textToProcess, time: userTime }]);

    try {
      const response = await fetch("/api/v1/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: textToProcess }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract data from backend. Try again.");
      }

      const data: ExtractionResult = await response.json();
      setExtraction(data);
      setIsSuccess(true);

      // Add bot response
      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setChatLog(prev => [
        ...prev,
        {
          sender: "bot",
          text: `Parsed successfully! Customer: "${data.customer_name}", Due: ₹${data.due_amount}. Please confirm details below to update the ledger.`,
          time: botTime,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setChatLog(prev => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I had trouble parsing that automatically. But don't worry, you can register or edit details manually.",
          time: botTime,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToLedger = async () => {
    if (!extraction) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/ledger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(extraction),
      });

      if (!response.ok) {
        const errDetails = await response.json();
        throw new Error(errDetails.error || "Failed to commit ledger entry.");
      }

      setServerSaved(true);
      setExtraction(null);
      setInputText("");
      onEntryAdded(); // trigger reload
    } catch (err: any) {
      setError(err.message || "Failed to save into ledger database.");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: keyof ExtractionResult, value: any) => {
    if (!extraction) return;
    
    const updated = { ...extraction, [key]: value };
    
    // Auto calculate due amount if total or paid changes
    if (key === "total_amount" || key === "paid_amount") {
      const tot = key === "total_amount" ? parseFloat(value) || 0 : extraction.total_amount;
      const pd = key === "paid_amount" ? parseFloat(value) || 0 : extraction.paid_amount;
      updated.due_amount = Math.max(0, tot - pd);
    }
    
    setExtraction(updated);
  };

  return (
    <div id="chat-simulator" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Visual WhatsApp Simulator Frame */}
      <div className="lg:col-span-7 flex flex-col h-[540px] rounded-lg border border-brand-border bg-[#0D1117] overflow-hidden shadow-lg relative">
        
        {/* WhatsApp Header Mock */}
        <div className="bg-[#1F2C34] py-3 px-4 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm">
              WL
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">WhatsApp Ledger Bot</h4>
              <p className="text-[11px] text-emerald-400 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                Active AI Extractor
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-zinc-400">
            <span className="text-xs font-mono py-0.5 px-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
              NVIDIA NIM & Gemini
            </span>
          </div>
        </div>

        {/* WhatsApp Message Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0A0D14] space-y-3 flex flex-col">
          {chatLog.map((chat, idx) => (
            <div
              key={idx}
              className={`max-w-[85%] p-3 rounded-lg text-sm relative ${
                chat.sender === "user"
                  ? "self-end bg-[#005C4B] text-white rounded-tr-none"
                  : "self-start bg-[#202C33] text-zinc-200 rounded-tl-none border border-zinc-800"
              }`}
            >
              <p className="leading-relaxed whitespace-pre-line">{chat.text}</p>
              <div className="text-[10px] text-zinc-400 text-right mt-1 font-mono">
                {chat.time}
              </div>
            </div>
          ))}
          {loading && (
            <div className="self-start bg-[#202C33] p-3 rounded-lg text-sm rounded-tl-none border border-zinc-800 text-zinc-400 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Analyzing conversational financial math...</span>
            </div>
          )}
        </div>

        {/* Quick Sample Selector in-line */}
        <div className="px-4 py-2 bg-[#121B22] border-t border-zinc-800">
          <p className="text-[11px] text-zinc-400 mb-1 font-semibold uppercase tracking-wider">
            ⚡ Quick Demo Suggestions
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-[82px] overflow-y-auto">
            {SAMPLE_MESSAGES.map((msg, index) => (
              <button
                key={index}
                onClick={() => handleSampleClick(msg)}
                className="text-[11px] bg-[#202C33] hover:bg-[#2A3942] text-zinc-300 py-1 px-2.5 rounded border border-zinc-800 transition text-left truncate max-w-full"
                title={msg}
              >
                {msg}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#1F2C34] border-t border-zinc-800">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type financial transactions done with customers..."
              className="flex-1 bg-[#2A3942] text-white text-sm py-2.5 px-4 rounded-md placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 border border-transparent"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleExtract(inputText);
              }}
            />
            <button
              id="btn-send-extract"
              disabled={loading || !inputText.trim()}
              onClick={() => handleExtract(inputText)}
              className="p-2.5 rounded-full bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Extracted Form Detail / Ledger Insertion Screen */}
      <div className="lg:col-span-5 flex flex-col justify-between border border-brand-border bg-brand-surface rounded-lg p-5">
        <div>
          <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              AI Ledger Assistant
            </h3>
            {serverSaved && (
              <span className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center font-semibold animate-pulse">
                <Check className="w-3 h-3 mr-1" /> Logged !
              </span>
            )}
          </div>

          {!extraction && !serverSaved && (
            <div className="h-[320px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-800 rounded bg-[#101010]">
              <MessageSquare className="w-10 h-10 text-zinc-600 mb-2" />
              <p className="text-zinc-300 font-medium text-sm">No Active Parsing</p>
              <p className="text-zinc-500 text-xs mt-1 max-w-[220px]">
                Type a transaction message on the left or click a demo suggestion to watch extraction live!
              </p>
            </div>
          )}

          {serverSaved && !extraction && (
            <div className="h-[320px] flex flex-col items-center justify-center text-center p-4 border border-dashed border-emerald-500/20 rounded bg-emerald-500/5">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-emerald-400 font-semibold text-sm">Ledger Synchronized!</p>
              <p className="text-zinc-400 text-xs mt-1 max-w-[240px]">
                Your transaction has been parsed, validated and saved securely in your business history.
              </p>
              <button
                onClick={() => setServerSaved(false)}
                className="mt-4 text-xs font-medium text-zinc-400 hover:text-white underline transition"
              >
                Clear state
              </button>
            </div>
          )}

          {extraction && (
            <div className="space-y-3">
              <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800 text-xs text-zinc-400 mb-2">
                Verify AI extraction accuracy below. You can adjust values before saving permanently to database.
              </div>

              {/* Customer Column */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest font-mono mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={extraction.customer_name}
                  onChange={(e) => handleFieldChange("customer_name", e.target.value)}
                  className="w-full bg-[#1A1A1A] text-white border border-brand-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Service Column */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest font-mono mb-1">
                  Business Service
                </label>
                <input
                  type="text"
                  value={extraction.service_name}
                  onChange={(e) => handleFieldChange("service_name", e.target.value)}
                  className="w-full bg-[#1A1A1A] text-white border border-brand-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Pricing Column Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest font-mono mb-1">
                    Total (₹)
                  </label>
                  <input
                    type="number"
                    value={extraction.total_amount}
                    onChange={(e) => handleFieldChange("total_amount", e.target.value)}
                    className="w-full bg-[#1A1A1A] text-white border border-brand-border rounded px-2.5 py-1.5 text-xs text-center font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest font-mono mb-1">
                    Paid (₹)
                  </label>
                  <input
                    type="number"
                    value={extraction.paid_amount}
                    onChange={(e) => handleFieldChange("paid_amount", e.target.value)}
                    className="w-full bg-[#1A1A1A] text-white border border-brand-border rounded px-2.5 py-1.5 text-xs text-center font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-widest font-mono mb-1 text-emerald-400">
                    Remaining (₹)
                  </label>
                  <div className="w-full bg-[#1F2C34]/30 border border-emerald-500/20 text-emerald-400 rounded px-2.5 py-1.5 text-xs text-center font-mono font-bold">
                    ₹{extraction.due_amount}
                  </div>
                </div>
              </div>

              {/* Limit/Followup */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest font-mono mb-1">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  value={extraction.follow_up_date}
                  onChange={(e) => handleFieldChange("follow_up_date", e.target.value)}
                  className="w-full bg-[#1A1A1A] text-white border border-brand-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              {extraction.total_amount < extraction.paid_amount && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded text-xs text-rose-400 flex items-start space-x-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Paid amount cannot be larger than the total fee. Please update numbers.</span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-2 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded text-xs text-rose-400 flex items-start space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {extraction && (
          <div className="pt-4 mt-4 border-t border-brand-border">
            <button
              id="btn-save-ledger"
              onClick={handleSaveToLedger}
              disabled={loading || (extraction.total_amount < extraction.paid_amount)}
              className="w-full bg-emerald-500 text-black py-2.5 rounded font-semibold text-sm hover:bg-emerald-400 transition flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Register to Ledger DB</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
