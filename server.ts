import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";

// Ensure data folder exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const LEDGER_FILE = path.join(DATA_DIR, "ledger_entries.json");

// Helper to read database
function readLedger(): any[] {
  try {
    if (fs.existsSync(LEDGER_FILE)) {
      const data = fs.readFileSync(LEDGER_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading ledger file, reverting to default:", err);
  }
  return [];
}

// Helper to write database
function writeLedger(entries: any[]) {
  try {
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing ledger file:", err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = 3000;

  // Lazy initialize Gemini client
  let ai: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
        ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      }
    }
    return ai;
  }

  // --- API ROUTE: Extract LLM Data ---
  app.post("/api/v1/extract", async (req, res): Promise<any> => {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message string is required." });
    }

    console.log(`Extracting data for message: "${message}"`);

    // Check if NVIDIA key or Gemini key is configured
    const client = getGeminiClient();

    let extractedData: any = null;

    if (client) {
      try {
        const currentDate = "2026-06-19";
        const systemPrompt = `You are an AI specialized in financial business parsing for micro-businesses using WhatsApp. 
Parse the input micro-business conversation update into a structured ledger schema. 
Today's date is Friday, June 19, 2026. Relative dates like 'next week' or 'tomorrow' must be calculated relative to Friday, June 19, 2026.
Ensure follow_up_date is formatted strictly as "YYYY-MM-DD" or left as an empty string.
Ensure total_amount, paid_amount, and due_amount are parsed as numeric values.
Validation constraints:
1. total_amount must be >= paid_amount.
2. due_amount must equal (total_amount - paid_amount).
3. Amounts cannot be negative.
If details are missing, solve using basic math or default to logical values (e.g. if total is 700 and paid is 500, due must be 200).`;

        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: message,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                customer_name: { type: Type.STRING, description: "Name of the customer (e.g. Raju, Sunita)" },
                service_name: { type: Type.STRING, description: "Specific service name (e.g. AC Repair, Plumbing)" },
                total_amount: { type: Type.NUMBER, description: "Total numeric fee" },
                paid_amount: { type: Type.NUMBER, description: "Amount paid already" },
                due_amount: { type: Type.NUMBER, description: "Outstanding due amount (Total - Paid)" },
                follow_up_date: { type: Type.STRING, description: "Target follow up date in YYYY-MM-DD. Empty string if no follow up is requested." }
              },
              required: ["customer_name", "service_name", "total_amount", "paid_amount", "due_amount"]
            }
          }
        });

        if (response.text) {
          try {
            extractedData = JSON.parse(response.text.trim());
          } catch (pe) {
            console.error("Failed to parse Gemini generated json, cleaning fallback", pe);
          }
        }
      } catch (err: any) {
        console.error("Gemini Extraction Error, using secondary parser:", err.message);
      }
    } else {
      console.log("No Gemini API key styled active. Using high-fidelity heuristic fallback parser.");
    }

    // Heuristic Fallback Parser if Gemini fails or is not available
    if (!extractedData) {
      const totalMatch = message.match(/(?:total|₹|rs\.?)\s*(\d+)/i) || message.match(/(\d+)\s*(?:total)/i);
      const paidMatch = message.match(/(?:paid|received|recieved|got)\s*(\d+)/i) || message.match(/(\d+)\s*(?:paid)/i);
      const remainingMatch = message.match(/(?:remaining|remaining|due|due_amount|left|remains|remaining ₹?|outstanding)\s*(\d+)/i);
      
      let total = totalMatch ? parseInt(totalMatch[1], 10) : 0;
      let paid = paidMatch ? parseInt(paidMatch[1], 10) : 0;
      let due = remainingMatch ? parseInt(remainingMatch[1], 10) : 0;

      // Extract raw numbers if keyword fail
      const allNumbers = (message.match(/\d+/g) || []).map((n) => parseInt(n, 10));
      if (allNumbers.length >= 2 && total === 0 && paid === 0) {
        total = allNumbers[0];
        paid = allNumbers[1];
        due = allNumbers.length >= 3 ? allNumbers[2] : total - paid;
      }

      if (total === 0 && paid > 0) {
        total = paid + due;
      } else if (total > 0 && paid === 0 && due === 0) {
        due = total;
      } else if (total > 0 && paid > 0 && due === 0) {
        due = total - paid;
      }

      // Customer name extraction (look for common names or capitalizations)
      let customer = "Raju";
      const nameMatch = message.match(/(?:for|to|from)\s+([A-Z][a-z]+)/);
      if (nameMatch) {
        customer = nameMatch[1];
      } else {
        const words = message.split(/\s+/);
        for (const w of words) {
          if (w.length > 2 && /^[A-Z][a-z]+$/.test(w) && !["Done", "Paid", "Remaining", "Total", "Call"].includes(w)) {
            customer = w;
            break;
          }
        }
      }

      // Service Name extraction
      let service = "AC Repair";
      const acMatch = message.match(/(ac repair|repair|service|plumbing|design|clearing|delivery|cater|painting)/i);
      if (acMatch) {
        service = acMatch[1].charAt(0).toUpperCase() + acMatch[1].slice(1);
      }

      // Follow up date
      let followUp = "";
      if (message.toLowerCase().includes("next week")) {
        followUp = "2026-06-26";
      } else if (message.toLowerCase().includes("tomorrow")) {
        followUp = "2026-06-20";
      } else if (message.toLowerCase().includes("next month")) {
        followUp = "2026-07-19";
      }

      extractedData = {
        customer_name: customer,
        service_name: service,
        total_amount: Math.max(0, total),
        paid_amount: Math.max(0, paid),
        due_amount: Math.max(0, due),
        follow_up_date: followUp
      };
    }

    // Apply strict validations inside Backend
    if (extractedData.total_amount < extractedData.paid_amount) {
      extractedData.total_amount = extractedData.paid_amount;
    }
    extractedData.due_amount = extractedData.total_amount - extractedData.paid_amount;

    return res.json(extractedData);
  });

  // --- API ROUTE: Create Ledger Entry ---
  app.post("/api/v1/ledger", (req, res): any => {
    const { customer_name, service_name, total_amount, paid_amount, due_amount, follow_up_date, status } = req.body;

    if (!customer_name || !service_name) {
      return res.status(400).json({ error: "customer_name and service_name are required." });
    }

    const total = parseFloat(total_amount) || 0;
    const paid = parseFloat(paid_amount) || 0;
    
    if (total < paid) {
      return res.status(400).json({ error: "Validation failed: total_amount must be greater than or equal to paid_amount." });
    }
    if (total < 0 || paid < 0) {
      return res.status(400).json({ error: "Validation failed: amounts cannot be negative." });
    }

    const calculatedDue = total - paid;
    let entryStatus = "Pending";
    if (calculatedDue === 0) {
      entryStatus = "Paid";
    } else if (paid > 0) {
      entryStatus = "Partially Paid";
    } else {
      entryStatus = "Unpaid";
    }

    const newEntry = {
      id: crypto.randomUUID(),
      customer_name,
      service_name,
      total_amount: total,
      paid_amount: paid,
      due_amount: calculatedDue,
      follow_up_date: follow_up_date || "",
      status: status || entryStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const ledger = readLedger();
    ledger.unshift(newEntry);
    writeLedger(ledger);

    return res.status(201).json(newEntry);
  });

  // --- API ROUTE: Get Ledger Entries (Paginated, Filtered, Sorted) ---
  app.get("/api/v1/ledger", (req, res): any => {
    const ledger = readLedger();

    // Filtering
    let filtered = [...ledger];
    const { search, status, sort_by, order } = req.query;

    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.customer_name.toLowerCase().includes(q) ||
          e.service_name.toLowerCase().includes(q)
      );
    }

    if (status && typeof status === "string" && status !== "All") {
      filtered = filtered.filter((e) => e.status === status);
    }

    // Sorting
    const sortBy = (sort_by && typeof sort_by === "string") ? sort_by : "created_at";
    const sortByOrder = (order && typeof order === "string") ? order : "desc";

    filtered.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortByOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortByOrder === "asc" ? 1 : -1;
      return 0;
    });

    return res.json({
      items: filtered,
      total: filtered.length
    });
  });

  // --- API ROUTE: Dashboard Analytics ---
  app.get("/api/v1/analytics", (req, res) => {
    const ledger = readLedger();

    const uniqueCustomers = new Set(ledger.map((e) => e.customer_name)).size;
    const totalJobs = ledger.length;
    const outstandingDues = ledger.reduce((acc, e) => acc + e.due_amount, 0);
    const paymentsCollected = ledger.reduce((acc, e) => acc + e.paid_amount, 0);

    return res.json({
      total_customers: uniqueCustomers,
      total_jobs: totalJobs,
      outstanding_dues: outstandingDues,
      payments_collected: paymentsCollected
    });
  });

  // --- API ROUTE: Follow-up Queue ---
  app.get("/api/v1/followups", (req, res) => {
    const ledger = readLedger();
    const followups = ledger
      .filter((e) => e.follow_up_date && e.due_amount > 0)
      .map((e) => ({
        id: e.id,
        customer_name: e.customer_name,
        follow_up_date: e.follow_up_date,
        due_amount: e.due_amount,
        service_name: e.service_name
      }));

    return res.json(followups);
  });

  // --- API ROUTE: Delete Entry ---
  app.delete("/api/v1/ledger/:id", (req, res): any => {
    const { id } = req.params;
    let ledger = readLedger();
    const index = ledger.findIndex((e) => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Entry not found" });
    }

    ledger.splice(index, 1);
    writeLedger(ledger);
    return res.json({ success: true, message: "Entry successfully deleted" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
