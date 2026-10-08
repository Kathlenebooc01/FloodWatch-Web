import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { registerChatTools, getChatContext } from "../lib/lantaw/chat-tools.mjs";
import { generateChatAnswer } from "../lib/lantaw/chat-provider.mjs";

// ── 1. Load Environment Variables from .env.local ─────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_LANTAW_AI;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, options = {}) => fetch(url, { ...options, signal: AbortSignal.any([options.signal, AbortSignal.timeout(6000)].filter(Boolean)) }) } }) : null;

const DEFAULT_MODEL = process.env.GEMINI_LANTAW_MODEL || "gemini-3.1-flash-lite";

// ── 2. Helper: Call Gemini Fast Model ──────────────────────────────────────────
async function callGemini(prompt, model = DEFAULT_MODEL) {
  const text = await generateChatAnswer(prompt, { model, apiKey: GEMINI_API_KEY,
    backupKey: process.env.GEMINI_LANTAW_BACKUP_AI,
    backupModel: process.env.GEMINI_LANTAW_BACKUP_MODEL,
    json: true, maxOutputTokens: 4096 });
  return JSON.stringify(JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')));
}

export function createLantawMcpServer() {
const server = new McpServer({
  name: "floodwatch-lantaw-mcp",
  version: "1.0.0",
});

// ── TOOL 1: Extract Inventory Items ──────────────────────────────────────────
server.tool(
  "extract_inventory_items",
  "Extracts structured emergency and disaster management equipment/inventory from raw text or table data.",
  {
    raw_text: z.string().describe("The unformatted text, CSV, or table content to extract inventory from."),
    context_hint: z.string().optional().describe("Optional context, e.g. 'PDRRMO Bohol Inventory' or 'Search and Rescue Assets'"),
  },
  async ({ raw_text, context_hint }) => {
    const prompt = `
You are Lantaw AI, a specialized disaster management inventory assistant for FloodWatch.

Context: ${context_hint || "Disaster Response Utility Extraction"}

TASK: Extract ALL emergency inventory and utility items from the text below into structured records.

OUTPUT FORMAT (Return strictly a JSON object):
{
  "extracted_items": [
    {
      "name": "Exact item name (e.g. Life Vest, Generator Set, Inflatable Rescue Boat)",
      "type": "Standard category: Medical & First Aid | Water Search & Rescue | Land Search & Rescue | Communication Equipment | Power & Lighting | Logistics & Transportation | Fire & Hazard Response | Heavy Equipment & Clearing Tools | Evacuation & Relief Supplies | General / Multi-Purpose Equipment",
      "serial_number": "Serial or control number if present, else null",
      "quantity": 1,
      "description": "Short specification or condition if available, else null"
    }
  ]
}

DATA TO EXTRACT:
${raw_text}
`;

    try {
      const resultText = await callGemini(prompt);
      return {
        content: [{ type: "text", text: resultText }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message, success: false }) }],
        isError: true,
      };
    }
  }
);

// ── TOOL 2: Detect Duplicate Inventory ───────────────────────────────────────
server.tool(
  "detect_duplicate_inventory",
  "Detects if an incoming inventory item is a semantic duplicate or synonym of existing items in FloodWatch.",
  {
    item_name: z.string().describe("The new item name to check."),
    existing_items: z.array(z.string()).describe("List of existing item names in the database to compare against."),
  },
  async ({ item_name, existing_items }) => {
    // 1. Instant deterministic check (0ms)
    const normalizedNew = item_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const existing of existing_items) {
      if (existing.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedNew) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                is_duplicate: true,
                matched_with: existing,
                confidence: 1.0,
                reason: "Exact or normalized name match.",
              }),
            },
          ],
        };
      }
    }

    // 2. Semantic AI check for synonyms (e.g., 'Life Jacket' vs 'Life Vest')
    const prompt = `
You are Lantaw AI Duplication Detector for FloodWatch.
Compare the incoming item against existing items.

Incoming Item: "${item_name}"
Existing Items: ${JSON.stringify(existing_items.slice(0, 50))}

Determine if the incoming item refers to the exact same physical equipment as one of the existing items (e.g. Life Jacket == Life Vest).

Return strictly JSON:
{
  "is_duplicate": boolean,
  "matched_with": string or null,
  "confidence": number between 0 and 1,
  "reason": "short explanation"
}
`;

    try {
      const resultText = await callGemini(prompt);
      return {
        content: [{ type: "text", text: resultText }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ is_duplicate: null, error: err.message }) }],
        isError: true,
      };
    }
  }
);

// ── TOOL 3: News Assist for Disaster Alerts ──────────────────────────────────
server.tool(
  "generate_news_assist",
  "Generates professional headlines, category tags, and detailed articles for the FloodWatch Disaster News Board.",
  {
    narration: z.string().describe("Short summary or notes about the disaster, flood, or relief operations."),
    preferred_tag: z.string().optional().describe("Optional preferred category tag like Flood, Weather, Rescue, Relief."),
  },
  async ({ narration, preferred_tag }) => {
    const prompt = `
You are Lantaw AI News Assist for the FloodWatch Disaster & Emergency Platform.
The provincial admin provided this short event update:
"${narration}"

Generate a formal news bulletin with:
1. headline: Concise, urgent, and professional headline.
2. tag: One-word category tag (e.g., ${preferred_tag || "Flood, Weather, Rescue, Alert, Relief"}).
3. detailed_content: 2-3 well-written, clear paragraphs expanding on the facts provided.

Return strictly JSON:
{
  "headline": "...",
  "tag": "...",
  "detailed_content": "..."
}
`;

    try {
      const resultText = await callGemini(prompt);
      return {
        content: [{ type: "text", text: resultText }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true,
      };
    }
  }
);

// ── TOOL 4: Query FloodWatch Utilities from Database ─────────────────────────
server.tool(
  "query_floodwatch_utilities",
  "Queries current emergency response equipment and utilities stored in the FloodWatch Supabase database.",
  {
    limit: z.number().optional().describe("Maximum number of items to retrieve (default: 20)."),
    category: z.string().optional().describe("Filter by category/type."),
  },
  async ({ limit = 20, category }) => {
    if (!supabase) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: "Supabase connection not configured." }) }],
        isError: true,
      };
    }

    try {
      let query = supabase.from("utilities").select("id, name, type, serial_number").limit(limit);
      if (category) {
        query = query.ilike("type", `%${category}%`);
      }
      const { data, error } = await query;
      if (error) throw error;

      return {
        content: [{ type: "text", text: JSON.stringify({ count: data.length, utilities: data }, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true,
      };
    }
  }
);

// ── TOOL 5: Analyze & Prioritize Requests with Weather Telemetry ─────────────
server.tool(
  "analyze_and_prioritize_requests",
  "Analyzes disaster resource requests against real-time weather conditions and historical vulnerability factors to produce an intelligent priority ranking.",
  {
    scope: z.string().optional().describe("Geographic scope or municipality to focus on (e.g. 'Cebu Province' or 'Northern Cebu')."),
  },
  async ({ scope }) => {
    try {
      const context = await getChatContext(supabase, 'requests');
      const prompt = 'Prioritize only these actual FloodWatch requests. No weather readings are supplied: mark weather impact unknown. Never invent requests, supplies, rainfall, hazard scores or locations. Return JSON with executive_summary and prioritized_queue; each entry must have rank, municipality, requested_items, priority_level, urgency_score and recommended_action. Scope: ' + (scope || 'Cebu Province') + '\nData: ' + JSON.stringify(context);
      const resultText = await callGemini(prompt);
      return {
        content: [{ type: "text", text: resultText }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true,
      };
    }
  }
);

// ── 4. Start Server on Stdio Transport ─────────────────────────────────────────
  registerChatTools(server, { db: supabase, weatherKey: process.env.OPENWEATHER_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY });
  return server;
}
