const GEMINI_API_KEY = process.env.GEMINI_LANTAW_AI;
const PRIMARY_MODEL = process.env.GEMINI_LANTAW_MODEL || 'gemini-2.5-flash';
const BACKUP_MODEL = process.env.GEMINI_LANTAW_BACKUP_MODEL || 'gemini-1.5-flash';

/**
 * Normalizes item names for deterministic matching (lowercase alphanumeric).
 */
export function normalizeName(name) {
  if (!name) return "";
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Fetches existing items from Supabase for duplicate detection.
 */
async function fetchExistingRecords(supabaseAdmin, targetTable = "utilities") {
  try {
    if (!supabaseAdmin) return [];
    if (targetTable === "pdrrmo_inventory") {
      const { data, error } = await supabaseAdmin
        .from('pdrrmo_inventory')
        .select('item_id, item_name, category, control_number');
      if (error) throw error;
      return data || [];
    } else {
      const { data, error } = await supabaseAdmin
        .from('utilities')
        .select('id, name, type, serial_number');
      if (error) throw error;
      return data || [];
    }
  } catch (err) {
    console.warn(`Warning: Could not fetch existing records from ${targetTable}:`, err.message);
    return [];
  }
}

/**
 * AI-powered semantic duplicate detection.
 */
async function detectSemanticDuplicates(incomingItems, existingDbItems, contextLabel = "utilities") {
  if (!incomingItems.length || !existingDbItems.length || !GEMINI_API_KEY) return [];

  // Limit existing items to avoid prompt token explosion (take latest / sample 100)
  const existingSample = existingDbItems.slice(0, 100);

  const prompt = `
You are Lantaw AI, a duplication detection assistant for the FloodWatch system.

TASK: Compare INCOMING ${contextLabel} against EXISTING ${contextLabel} and identify genuine duplicates.

RULES:
1. Two items are duplicates if they refer to the SAME real-world item, even with different wording (e.g. 'Life Vest' ↔ 'Life Jacket', 'Rescue Boat Model A' ↔ 'Rescue Boat Model-A').
2. Matching serial numbers are a strong indicator of duplication.
3. Be conservative — only flag genuine duplicates, not items that are merely similar.

--- INCOMING ${contextLabel.toUpperCase()} ---
${JSON.stringify(incomingItems, null, 2)}

--- EXISTING ${contextLabel.toUpperCase()} ---
${JSON.stringify(existingSample, null, 2)}

RESPONSE FORMAT:
Return ONLY a raw JSON array:
[
  {
    "incoming_index": 0,
    "confidence": 0.95,
    "reason": "Life Jacket is synonymous with existing Life Vest"
  }
]
If NO duplicates are found, return: []
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const cleaned = raw.replace(/^```json\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Semantic duplicate check warning:", err.message);
    return [];
  }
}

/**
 * Cleanses extracted items through multi-stage deterministic & AI deduplication.
 */
export async function cleanseAndFilterItems(extractedItems, targetTable = "utilities", supabaseAdmin = null) {
  if (!Array.isArray(extractedItems)) {
    return {
      cleaned_items: [],
      cleansing_insight: {
        total_raw: 0,
        discarded_invalid: 0,
        duplicates_removed: 0,
        reasons: [],
      },
    };
  }

  const totalRaw = extractedItems.length;
  const validItems = [];
  let discardedInvalid = 0;
  const reasons = [];

  // ── Stage 1: Filter invalid & noise rows ──────────────────────────────────
  for (const item of extractedItems) {
    if (!item || typeof item !== 'object') {
      discardedInvalid++;
      continue;
    }

    const nameVal = String(item.name || item.item_name || "").trim();
    const typeVal = String(item.type || item.category || "").trim();
    const serialVal = String(item.serial_number || item.control_number || "").trim();

    const isNoise = (
      !nameVal ||
      ["total", "grand total", "summary", "subtotal", "name", "item name", "item", "description", "item_name"].includes(nameVal.toLowerCase()) ||
      (!typeVal && !serialVal && nameVal.length < 2)
    );

    if (isNoise) {
      discardedInvalid++;
      if (nameVal) {
        reasons.push(`Discarded non-inventory/header row '${nameVal}'`);
      }
    } else {
      validItems.push(item);
    }
  }

  // ── Stage 2: In-File Deterministic Deduplication ───────────────────────────
  const seenFileNames = new Set();
  const itemsAfterFileDedup = [];
  let internalDupsCount = 0;

  for (const item of validItems) {
    const rawName = item.name || item.item_name || "";
    const norm = normalizeName(rawName);

    if (seenFileNames.has(norm)) {
      internalDupsCount++;
      reasons.push(`Removed duplicate item name '${rawName}' repeated within file`);
    } else {
      seenFileNames.add(norm);
      itemsAfterFileDedup.push(item);
    }
  }

  // ── Stage 3: Database Scope Deterministic Deduplication ────────────────────
  const existingDb = await fetchExistingRecords(supabaseAdmin, targetTable);
  const existingDbNames = new Set();

  for (const dbRow of existingDb) {
    const dbName = dbRow.name || dbRow.item_name || "";
    const norm = normalizeName(dbName);
    if (norm) existingDbNames.add(norm);
  }

  const itemsAfterDbDedup = [];
  let dbDupsCount = 0;

  for (const item of itemsAfterFileDedup) {
    const rawName = item.name || item.item_name || "";
    const norm = normalizeName(rawName);

    if (existingDbNames.has(norm)) {
      dbDupsCount++;
      const tblLabel = targetTable === "pdrrmo_inventory" ? "PDRRMO Command Center" : "Shared Inventory";
      reasons.push(`Removed database duplicate item name '${rawName}' already in ${tblLabel}`);
    } else {
      itemsAfterDbDedup.push(item);
    }
  }

  // ── Stage 4: AI Semantic Deduplication ───────────────────────────────────
  let finalCleanedItems = itemsAfterDbDedup;
  let aiDupsCount = 0;

  if (itemsAfterDbDedup.length > 0 && existingDb.length > 0) {
    try {
      const semanticDuplicates = await detectSemanticDuplicates(
        itemsAfterDbDedup,
        existingDb,
        targetTable === "pdrrmo_inventory" ? "inventory items" : "utilities"
      );

      const aiDupIndices = new Set();
      for (const dup of semanticDuplicates) {
        const incIdx = dup.incoming_index;
        if (incIdx !== undefined && incIdx >= 0 && incIdx < itemsAfterDbDedup.length) {
          aiDupIndices.add(incIdx);
          const reasonTxt = dup.reason || "Semantic duplicate found";
          const itemNameStr = itemsAfterDbDedup[incIdx].name || itemsAfterDbDedup[incIdx].item_name || "";
          reasons.push(`Lantaw AI removed semantic duplicate '${itemNameStr}' (${reasonTxt})`);
        }
      }

      finalCleanedItems = itemsAfterDbDedup.filter((_, i) => !aiDupIndices.has(i));
      aiDupsCount = aiDupIndices.size;
    } catch (aiErr) {
      console.warn("AI semantic deduplication skipped due to error:", aiErr.message);
    }
  }

  const totalDuplicatesRemoved = internalDupsCount + dbDupsCount + aiDupsCount;

  return {
    cleaned_items: finalCleanedItems,
    cleansing_insight: {
      total_raw: totalRaw,
      discarded_invalid: discardedInvalid,
      duplicates_removed: totalDuplicatesRemoved,
      reasons: reasons,
    },
  };
}
