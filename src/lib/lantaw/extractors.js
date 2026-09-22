import * as XLSX from 'xlsx';

const GEMINI_API_KEY = process.env.GEMINI_LANTAW_AI;
const PRIMARY_MODEL = process.env.GEMINI_LANTAW_MODEL || 'gemini-2.5-flash';
const BACKUP_MODEL = process.env.GEMINI_LANTAW_BACKUP_MODEL || 'gemini-1.5-flash';

const INVENTORY_EXTRACTION_PROMPT = `
You are Lantaw AI, a specialized data extraction assistant for the FloodWatch Disaster & Emergency Management Platform.

Analyze the uploaded content and extract ALL inventory and emergency utility items into structured records.

OUTPUT FORMAT:
Return ONLY a valid raw JSON object (no markdown code blocks, no backticks, no conversational text):
{
  "data_type": "<spreadsheet|document|image|table>",
  "description": "<brief description of the source content>",
  "extracted_items": [
    {
      "name": "<exact item name, e.g. Inflatable Rescue Boat, Life Vest, Generator Set>",
      "type": "<item category/type, e.g. Water Rescue, Medical, Logistics, Communication>",
      "serial_number": "<serial or control number if present, else null>",
      "quantity": <number, e.g. 5>,
      "description": "<brief specifications or condition if present, else null>"
    }
  ]
}

RULES:
1. Extract EVERY inventory item row. Do NOT truncate or skip rows.
2. Standardize column headers:
   - Item Name / Item / Description / Equipment -> "name"
   - Type / Category / Classification / Group -> "type"
   - Serial No. / Serial Number / Control No. / Asset Tag -> "serial_number"
   - Quantity / Qty / Total Count / Units -> "quantity"
3. Clean up formatting (trim whitespace, eliminate noise).
4. Do NOT hallucinate or invent records not present in the content.
`;

/**
 * Calls the Gemini API with fallback support.
 */
async function callGemini(contents, model = PRIMARY_MODEL) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_LANTAW_AI API key is not configured.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: Array.isArray(contents) ? contents : [{ parts: [{ text: contents }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${model}): ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  return rawText;
}

/**
 * Calls Gemini with fallback to backup model if primary fails.
 */
async function callGeminiWithFallback(contents) {
  try {
    return await callGemini(contents, PRIMARY_MODEL);
  } catch (primaryErr) {
    console.warn(`Primary model (${PRIMARY_MODEL}) failed in extractor, falling back to ${BACKUP_MODEL}:`, primaryErr.message);
    return await callGemini(contents, BACKUP_MODEL);
  }
}

/**
 * Cleans and parses raw JSON string from AI.
 */
function parseAiJson(rawText) {
  let cleaned = (rawText || "").trim();
  if (cleaned.startsWith("```json")) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith("```")) cleaned = cleaned.slice(3);
  if (cleaned.endsWith("```")) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("Failed to parse AI JSON response:", rawText);
    return { extracted_items: [] };
  }
}

/**
 * Standardize table rows into inventory items format.
 */
function standardizeRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  return rows.map((row) => {
    // Find matching keys dynamically regardless of case
    const keys = Object.keys(row);
    const findVal = (patterns) => {
      const matchedKey = keys.find(k => patterns.some(p => k.toLowerCase().trim().includes(p)));
      return matchedKey !== undefined ? row[matchedKey] : null;
    };

    const nameVal = findVal(["name", "item", "description", "equipment", "asset"]) ?? "";
    const typeVal = findVal(["type", "category", "classification", "group", "class"]) ?? "";
    const serialVal = findVal(["serial", "control", "tag", "sn", "code", "id"]) ?? null;
    const qtyVal = findVal(["qty", "quantity", "count", "units", "amount", "total"]) ?? 1;
    const descVal = findVal(["remarks", "details", "condition", "specification", "notes"]) ?? null;

    const parsedQty = parseInt(qtyVal, 10);

    return {
      name: String(nameVal || "").trim(),
      type: String(typeVal || "").trim(),
      serial_number: serialVal ? String(serialVal).trim() : null,
      quantity: !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1,
      description: descVal ? String(descVal).trim() : null,
    };
  });
}

/**
 * Extracts data from spreadsheets (.xlsx, .xls, .csv).
 */
export async function extractSpreadsheet(buffer, ext) {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { items: [], rawContent: [], error: "No sheets found in workbook." };
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows || rows.length === 0) {
      return { items: [], rawContent: [], error: "Spreadsheet is empty." };
    }

    const standardized = standardizeRows(rows);

    // If simple heuristic didn't find names, use Gemini to intelligently map columns
    const hasValidNames = standardized.filter(r => r.name && r.name.length > 1).length > 0;
    if (!hasValidNames && rows.length > 0) {
      const aiPrompt = `${INVENTORY_EXTRACTION_PROMPT}\n\n--- SPREADSHEET ROWS ---\n${JSON.stringify(rows.slice(0, 100), null, 2)}`;
      const aiResultRaw = await callGeminiWithFallback(aiPrompt);
      const aiParsed = parseAiJson(aiResultRaw);
      return {
        items: aiParsed.extracted_items || [],
        rawContent: rows,
        error: null,
      };
    }

    return {
      items: standardized,
      rawContent: rows,
      error: null,
    };
  } catch (err) {
    console.error("Spreadsheet extraction error:", err);
    return { items: [], rawContent: [], error: `Failed to extract spreadsheet: ${err.message}` };
  }
}

/**
 * Extracts data from plain text files (.txt).
 */
export async function extractPlainText(buffer) {
  try {
    const text = buffer.toString('utf-8').trim();
    if (!text) {
      return { items: [], rawContent: text, error: "Text file is empty." };
    }

    const aiPrompt = `${INVENTORY_EXTRACTION_PROMPT}\n\n--- TEXT CONTENT ---\n${text.slice(0, 10000)}`;
    const aiResultRaw = await callGeminiWithFallback(aiPrompt);
    const aiParsed = parseAiJson(aiResultRaw);

    return {
      items: aiParsed.extracted_items || [],
      rawContent: text,
      error: null,
    };
  } catch (err) {
    console.error("Text extraction error:", err);
    return { items: [], rawContent: "", error: `Failed to extract text: ${err.message}` };
  }
}

/**
 * Extracts data from images or PDFs via Gemini Multimodal.
 */
export async function extractMultimodal(buffer, mimeType) {
  try {
    const base64Data = buffer.toString('base64');

    const contents = [
      {
        parts: [
          { text: INVENTORY_EXTRACTION_PROMPT },
          {
            inlineData: {
              mimeType: mimeType || 'image/png',
              data: base64Data,
            },
          },
        ],
      },
    ];

    const aiResultRaw = await callGeminiWithFallback(contents);
    const aiParsed = parseAiJson(aiResultRaw);

    return {
      items: aiParsed.extracted_items || [],
      rawContent: aiParsed.description || "Image/Document processed",
      error: null,
    };
  } catch (err) {
    console.error("Multimodal extraction error:", err);
    return { items: [], rawContent: null, error: `Failed to extract content: ${err.message}` };
  }
}
