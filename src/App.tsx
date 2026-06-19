import React, { useState, useEffect, useCallback } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  Calendar, 
  Filter, 
  Sparkles, 
  Clock, 
  MessageSquare,
  AlertCircle, 
  Play, 
  TrendingUp, 
  FileSpreadsheet, 
  MessageCircle,
  HelpCircle,
  FolderSync,
  Building,
  CheckCircle,
  RefreshCw,
  Share2
} from "lucide-react";
import { LedgerEntry, DashboardAnalytics, FollowupItem } from "./types";
import AnalyticsCards from "./components/AnalyticsCards";
import ChatSimulator from "./components/ChatSimulator";

export default function App() {
  // Database States
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics>({
    total_customers: 0,
    total_jobs: 0,
    outstanding_dues: 0,
    payments_collected: 0,
  });
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  
  // Interaction/Query States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Quick Input Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    customer_name: "",
    service_name: "",
    total_amount: "",
    paid_amount: "",
    follow_up_date: "",
  });
  const [manualError, setManualError] = useState<string | null>(null);

  // Status simulation toast / mock notifications
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Fetch Ledger, Analytics and Followup queue together
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch entries
      const entriesRes = await fetch(
        `/api/v1/ledger?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}&sort_by=${sortBy}&order=${sortOrder}`
      );
      if (!entriesRes.ok) throw new Error("Could not fetch ledger entries.");
      const entriesJson = await entriesRes.json();
      setLedgerEntries(entriesJson.items || []);

      // 2. Fetch analytics
      const analyticsRes = await fetch("/api/v1/analytics");
      if (analyticsRes.ok) {
        const analyticsJson = await analyticsRes.json();
        setAnalytics(analyticsJson);
      }

      // 3. Fetch followups queue
      const followupsRes = await fetch("/api/v1/followups");
      if (followupsRes.ok) {
        const followupsJson = await followupsRes.json();
        setFollowups(followupsJson);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load dashboard data from backend.");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  // Load database on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle entry deletion
  const handleDeleteEntry = async (id: string, customer: string) => {
    if (!confirm(`Are you sure you want to remove the ledger entry for "${customer}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/ledger/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete entry from database.");
      }

      showToast(`Entry for "${customer}" successfully deleted.`, "info");
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message || "Error deleting entry.");
    }
  };

  // Handle Manual Form Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);

    const { customer_name, service_name, total_amount, paid_amount, follow_up_date } = manualForm;
    if (!customer_name.trim() || !service_name.trim()) {
      setManualError("Customer name and service type are required.");
      return;
    }

    const total = parseFloat(total_amount) || 0;
    const paid = parseFloat(paid_amount) || 0;

    if (total < 0 || paid < 0) {
      setManualError("Amounts cannot be negative.");
      return;
    }
    if (total < paid) {
      setManualError("Total amount must be greater than or equal to paid amount.");
      return;
    }

    try {
      const response = await fetch("/api/v1/ledger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: customer_name.trim(),
          service_name: service_name.trim(),
          total_amount: total,
          paid_amount: paid,
          due_amount: total - paid,
          follow_up_date,
        }),
      });

      if (!response.ok) {
        const details = await response.json();
        throw new Error(details.error || "Failed to save record.");
      }

      showToast(`Successfully registered "${customer_name}" to ledger.`, "success");
      setManualForm({
        customer_name: "",
        service_name: "",
        total_amount: "",
        paid_amount: "",
        follow_up_date: "",
      });
      setShowManualModal(false);
      fetchDashboardData();
    } catch (err: any) {
      setManualError(err.message || "Failed to insert record.");
    }
  };

  // Mock reminder triggered
  const triggerReminder = (customer: string, phone: string, amount: number) => {
    alert(`[Simulation] Sending WhatsApp Business Reminder API request...\nRecipient: ${customer}\nMessage: "Hi ${customer}, friendly reminder from our ledger that you have an outstanding due of ₹${amount} for our services. Please clear it earliest. Thanks!"`);
    showToast(`WhatsApp reminder request dispatched for ${customer}!`);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      
      {/* Toast Alert overlay */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 border border-emerald-500/30 text-white rounded-lg p-4 shadow-xl flex items-center space-x-3 text-sm animate-bounce">
          <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-zinc-100">{notification.message}</p>
            <p className="text-[11px] text-zinc-400">Database updated in real-time</p>
          </div>
        </div>
      )}

      {/* Global Header */}
      <header className="border-b border-brand-border bg-brand-surface py-4 px-6 md:px-12 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo / Brand Name */}
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500 text-black flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-500/10 tracking-tighter">
              WL
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-white tracking-tight">WhatsApp Ledger</h1>
                <span className="text-[9px] font-mono tracking-widest uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  Business Memory AI
                </span>
              </div>
              <p className="text-xs text-zinc-400">Conversational Business Bookkeeping Client</p>
            </div>
          </div>

          {/* Configuration and info metadata */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowManualModal(true)}
              className="bg-[#1C1B1B] hover:bg-zinc-800 border border-brand-border hover:border-zinc-700 text-zinc-200 text-xs py-2 px-3 rounded font-medium transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Manual Entry</span>
            </button>
            <button 
              onClick={fetchDashboardData}
              className="bg-[#1C1B1B] hover:bg-zinc-800 border border-brand-border text-zinc-300 p-2 rounded hover:text-white transition"
              title="Sync Latest Database"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        
        {/* Analytics Highlights Section */}
        <div className="bg-[#111111] p-1.5 border border-brand-border rounded-lg bg-opacity-40">
          <AnalyticsCards analytics={analytics} />
        </div>

        {/* Level 2: AI Parser / WhatsApp Interactive Sandbox */}
        <section className="bg-brand-surface rounded-lg border border-brand-border p-6">
          <div className="mb-4">
            <h2 className="text-md font-bold text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Conversational WhatsApp Parsing Console
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Test parsing natural language chats. Tap one of our preloaded demo templates in the console to watch automatic extraction in action.
            </p>
          </div>
          <ChatSimulator onEntryAdded={fetchDashboardData} />
        </section>

        {/* Level 3: Database Ledger Table and Followup Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Ledger Database list: 8 columns width */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111111] p-4 rounded-lg border border-brand-border">
              
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Search className="w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by customer or service..."
                  className="bg-transparent text-sm text-zinc-200 focus:outline-none placeholder-zinc-500 w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
                {/* Status Tabs */}
                <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 p-1 rounded text-xs text-zinc-400">
                  {["All", "Paid", "Partially Paid", "Unpaid"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-2.5 py-1 rounded transition font-medium ${
                        statusFilter === status 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "hover:text-zinc-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* Sort Option */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-zinc-900 text-xs text-zinc-300 border border-zinc-800 rounded py-1.5 px-2.5 focus:outline-none"
                >
                  <option value="created_at">Date Added</option>
                  <option value="customer_name">Customer</option>
                  <option value="total_amount">Total Amount</option>
                  <option value="due_amount">Outstanding Due</option>
                </select>

                <button
                  onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
                  className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 p-1.5 rounded text-xs text-zinc-300"
                  title={sortOrder === "desc" ? "Sort descending" : "Sort ascending"}
                >
                  <span className="font-mono text-[10px] uppercase font-bold px-1">
                    {sortOrder === "desc" ? "↓" : "↑"}
                  </span>
                </button>
              </div>

            </div>

            {/* Table or state box */}
            <div className="border border-brand-border bg-brand-surface rounded-lg overflow-hidden">
              {loading && ledgerEntries.length === 0 ? (
                <div className="p-12 text-center text-zinc-400 text-xs font-mono">
                  Loading business matrix memory...
                </div>
              ) : ledgerEntries.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-zinc-700 mb-3" />
                  <p className="font-semibold text-sm text-zinc-400">No matched entries</p>
                  <p className="text-xs mt-1 text-zinc-500 max-w-sm mx-auto">
                    Try adjusting search filter keywords or create new ones using the WhatsApp parser simulation above.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border bg-zinc-900/30 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider font-mono">
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Service category</th>
                        <th className="py-3 px-4 text-right">Total Amount</th>
                        <th className="py-3 px-4 text-right">Payments</th>
                        <th className="py-3 px-4 text-right">Dues remaining</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border text-sm">
                      {ledgerEntries.map((entry) => {
                        // Badge coloration
                        let statusColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                        if (entry.status === "Unpaid") {
                          statusColor = "bg-red-500/10 text-red-400 border border-red-500/20";
                        } else if (entry.status === "Partially Paid") {
                          statusColor = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                        }

                        return (
                          <tr key={entry.id} className="hover:bg-zinc-800/25 transition">
                            <td className="py-3.5 px-4 font-semibold text-white">
                              {entry.customer_name}
                            </td>
                            <td className="py-3.5 px-4 text-zinc-300">
                              <span className="bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-xs select-none">
                                {entry.service_name}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-medium text-zinc-300">
                              ₹{entry.total_amount.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-zinc-400">
                              ₹{entry.paid_amount.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-emerald-450 font-semibold text-emerald-400">
                              ₹{entry.due_amount.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${statusColor}`}>
                                {entry.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleDeleteEntry(entry.id, entry.customer_name)}
                                className="p-1 px-2 text-zinc-500 hover:text-red-400 border border-transparent hover:border-zinc-800 rounded transition"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="bg-zinc-900/30 p-3 px-4 border-t border-brand-border flex items-center justify-between text-xs text-zinc-500 font-mono">
                <span>Displaying {ledgerEntries.length} total entries</span>
                <span>Active Server State: ONLINE</span>
              </div>
            </div>
          </div>

          {/* Followups Sidebar: 4 columns width */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Follow-up widget queue */}
            <div className="border border-brand-border bg-[#111111] rounded-lg p-5">
              <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  Due Follow-up Pipeline
                </h3>
                <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono">
                  {followups.length} Left
                </span>
              </div>

              {followups.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  All clean! No upcoming dues require follow-up calls or reminders.
                </div>
              ) : (
                <div className="space-y-3">
                  {followups.map((item) => (
                    <div 
                      key={item.id}
                      className="p-3 bg-brand-surface rounded border border-brand-border hover:border-zinc-700 transition space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.customer_name}</p>
                          <p className="text-[11px] text-zinc-500">{item.service_name}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded">
                          ₹{item.due_amount}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-900">
                        <span className="flex items-center text-zinc-400 font-mono">
                          <Clock className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                          {item.follow_up_date}
                        </span>
                        
                        <button
                          onClick={() => triggerReminder(item.customer_name, "9999999999", item.due_amount)}
                          className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded transition font-mono"
                        >
                          Send Ping
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Static Knowledge Board / Help documentation box */}
            <div className="border border-brand-border bg-gradient-to-b from-brand-surface to-[#0A0A0A] rounded-lg p-5">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-white mb-2 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-500" />
                Ledger API Guide
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed space-y-1">
                WhatsApp Ledger processes chat strings into pristine JSON schema instantly. It uses 
                <strong> Advanced Local AI Model parsing heuristics</strong> matched with 
                <strong> Gemini LLMs</strong>.
              </p>
              <div className="mt-3 p-3 bg-zinc-900/50 rounded border border-zinc-800 font-mono text-[11px] text-zinc-300">
                <span className="text-emerald-400 font-semibold">POST</span> /api/v1/extract<br/>
                <span className="text-zinc-500">payload:</span> &#123; "message": ... &#125;<br/>
                <span className="text-emerald-400 font-semibold">POST</span> /api/v1/ledger<br/>
                <span className="text-zinc-500">payload:</span> JSON Extraction Record
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Manual Input Entry Modals */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-brand-surface border border-brand-border rounded-lg max-w-md w-full p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Manual Ledger Registration
              </h3>
              <button 
                onClick={() => {
                  setShowManualModal(false);
                  setManualError(null);
                }} 
                className="text-zinc-400 hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            {manualError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-450 text-xs text-rose-400 rounded flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{manualError}</span>
              </div>
            )}

            <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 uppercase tracking-widest font-mono font-semibold mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={manualForm.customer_name}
                  onChange={(e) => setManualForm(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="w-full bg-[#1A1A1A] text-white border border-brand-border rounded px-3 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 uppercase tracking-widest font-mono font-semibold mb-1">
                  Service Category
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Appliance Repair, Delivery, Design"
                  value={manualForm.service_name}
                  onChange={(e) => setManualForm(prev => ({ ...prev, service_name: e.target.value }))}
                  className="w-full bg-[#1A1A1A] text-white border border-brand-border rounded px-3 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 uppercase tracking-widest font-mono font-semibold mb-1">
                    Total Charge (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="700"
                    value={manualForm.total_amount}
                    onChange={(e) => setManualForm(prev => ({ ...prev, total_amount: e.target.value }))}
                    className="w-full bg-[#1A1A1A] text-white border border-brand-border rounded px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 uppercase tracking-widest font-mono font-semibold mb-1">
                    Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="500"
                    value={manualForm.paid_amount}
                    onChange={(e) => setManualForm(prev => ({ ...prev, paid_amount: e.target.value }))}
                    className="w-full bg-[#1A1A1A] text-white border border-brand-border rounded px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 uppercase tracking-widest font-mono font-semibold mb-1">
                  Follow Up Target (Optional)
                </label>
                <input
                  type="date"
                  value={manualForm.follow_up_date}
                  onChange={(e) => setManualForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                  className="w-full bg-[#1A1A1A] text-white border border-brand-border rounded px-3 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-brand-border flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualModal(false);
                    setManualError(null);
                  }}
                  className="px-4 py-2 border border-brand-border text-zinc-400 hover:text-white rounded text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 py-2 rounded text-xs transition"
                >
                  Commit Entry
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Footer credits */}
      <footer className="border-t border-brand-border bg-[#0E0E0E] py-6 px-6 text-center text-xs text-zinc-500 mt-12 font-mono">
        <p>© 2026 WhatsApp Ledger • Business Memory Inside WhatsApp Sandbox</p>
      </footer>

    </div>
  );
}
