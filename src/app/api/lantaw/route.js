import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.NEXT_SERVICE_ROLE_KEY
const GEMINI_API_KEY = process.env.GEMINI_LANTAW_AI
const PRIMARY_MODEL = process.env.GEMINI_LANTAW_MODEL || 'gemini-3.5-flash'
const BACKUP_MODEL = process.env.GEMINI_LANTAW_BACKUP_MODEL || 'gemini-2.5-flash'

// Initialize Supabase with service role for backend access
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// --- LantawThinking: Guardrails ---
function getGuardrails() {
    return (
        "\n\n--- STRICT DOMAIN RESTRICTIONS & GUARDRAILS ---\n" +
        "1. NO WEB SEARCHING: You do not have internet access. You cannot browse the web to fetch live external data.\n" +
        "2. FACTUAL DATA SOURCING: When answering questions that require specific facts, statistics, or database records, you MUST pull EXCLUSIVELY from the provided 'CONTEXT DATA' (Inventory, Telemetry, Incidents, etc.). Do not invent or assume any factual data outside of this context.\n" +
        "3. CREATIVE AND GUIDANCE EXCEPTIONS: You ARE fully allowed to use your own internal reasoning and knowledge to generate content such as drafting emails, writing guidance protocols, summarizing information, or providing general disaster management advice, provided you do not pretend to have live external facts.\n" +
        "4. DENIAL OF UNRELATED QUERIES: If the user's query is completely nonsense or blatantly off-topic (e.g., asking about unrelated pop culture or general trivia), politely reject it by stating you are Lantaw AI, a specialized assistant for FloodWatch.\n" +
        "5. NO HALLUCINATIONS: Do not invent database records, sensor readings, or fake incident reports under any circumstances."
    )
}

// --- LantawPrompt: Build the system persona ---
function buildSystemPersona() {
    return (
        "You are Lantaw AI, the intelligent assistant for the FloodWatch Disaster Management Platform. " +
        "Provide accurate, actionable, and concise insights regarding flood monitoring, weather data, and safety protocols. " +
        "Do not use conversational filler. Be direct and strictly professional."
    )
}

// --- LantawFormatting: Formatting rules ---
function getFormattingRules() {
    return (
        "\n\n--- FORMAT INSTRUCTIONS ---\n" +
        "Format your response using clean Markdown. Use headings (##, ###) to separate sections, bullet points for lists, and bold text (**text**) for emphasis. Keep paragraphs short, structured, and easy to read."
    )
}

// --- LantawTableFormatting: Chart/Table instructions ---
function getChartInstructions() {
    return (
        "\n\n--- VISUALIZATION FORMAT INSTRUCTIONS ---\n" +
        "If the user requests data visualization, charts, or graphs, you MUST return a RAW JSON object. " +
        "Do NOT include markdown formatting, markdown code blocks, or conversational text.\n\n" +
        "You are RESTRICTED to ONLY the following chart types: 'bar', 'area', or 'pie'.\n\n" +
        "The JSON must strictly follow this structure:\n" +
        '{ "visualization": "chart", "type": "<chart_type>", "title": "<Chart Title>", "description": "<Brief description>", ' +
        '"chart_config": { "<dataKey>": { "label": "<Label>", "color": "hsl(var(--chart-1))" } }, ' +
        '"chart_data": [ { "label": "Category 1", "<dataKey>": 150 } ] }\n'
    )
}

// --- LantawDocumentFile: Document generation instructions ---
function getDocumentInstructions() {
    return (
        "\n\n--- DOCUMENT GENERATION INSTRUCTIONS ---\n" +
        "CRITICAL: You must NEVER proactively generate a document or downloadable file on your own. " +
        "You are ONLY allowed to return the document JSON format if the user's query EXPLICITLY mentions " +
        "keywords such as: 'generate a file', 'download', 'export', 'create a document', 'create a PDF', " +
        "'create a DOCX', 'make me a report file', 'downloadable', or similar clear file-generation intent.\n\n" +
        "If the user simply asks a question, requests information, or says 'give me a report' without " +
        "mentioning a file or download, respond with a normal markdown answer instead. " +
        "Do NOT assume the user wants a file. Only generate the document JSON when file intent is unmistakable.\n\n" +
        "When the user DOES explicitly request a downloadable file, you must return a RAW JSON configuration block AT the VERY TOP of your response, followed by the raw markdown content below it.\n\n" +
        "You are RESTRICTED to ONLY these file formats: 'docx' or 'pdf'.\n\n" +
        "1. Start your response with exactly this JSON block:\n" +
        '```json\n{ "document": true, "format": "<docx|pdf>", "title": "<Document Title>" }\n```\n\n' +
        "2. Directly below the JSON block, write the full markdown content of the document.\n\n" +
        "RULES:\n" +
        "- 'format' MUST be either 'docx' or 'pdf'. Default to 'pdf' if the user doesn't specify.\n" +
        "- NO MARKDOWN TABLES: The document generator does NOT support Markdown tables (e.g. `| Col | Col |`). You must NEVER use tables.\n" +
        "- Instead of tables, use structured, nested bullet points to present data (e.g. `* Station A:\\n  - Temp: 32C\\n  - Wind: 2m/s`).\n" +
        "- The markdown content below the JSON block should be well-structured with headings, bullet points, and paragraphs.\n" +
        "- Include a proper title, date, and sections appropriate for the document type.\n" +
        "- Do NOT include any conversational text, just the JSON block and the document markdown.\n"
    )
}

// --- LantawSheet: Spreadsheet generation instructions ---
function getSheetInstructions() {
    return (
        "\n\n--- SPREADSHEET GENERATION INSTRUCTIONS ---\n" +
        "CRITICAL: You must NEVER proactively generate a spreadsheet on your own. " +
        "You are ONLY allowed to return the spreadsheet JSON format if the user's query EXPLICITLY mentions " +
        "keywords such as: 'spreadsheet', 'excel', 'xlsx', 'export to sheet', 'download sheet', " +
        "'generate spreadsheet', or similar clear spreadsheet intent.\n\n" +
        "If the user simply asks a question or wants information, respond normally.\n\n" +
        "When the user DOES explicitly request a spreadsheet, return a RAW JSON object (no markdown code blocks).\n\n" +
        "The JSON must strictly follow this structure:\n" +
        '{ "spreadsheet": true, "source": "<source_table>", "title": "<Sheet Title>" }\n\n' +
        "RULES:\n" +
        "- 'source' MUST be one of these exact table names: 'pdrrmo_inventory', 'weather_telemetry', 'incident_report', 'air_quality', 'distress_signals', 'utilities'\n" +
        "- The data will be pulled DIRECTLY from the database. You do NOT generate or invent any rows.\n" +
        "- Choose the source table that best matches what the user is asking for.\n" +
        "- If the user asks for multiple sources, pick the single most relevant one.\n" +
        "- Do NOT include any conversational text outside the JSON object.\n"
    )
}

// --- LantawFileStructurePlan: File content security and structure ---
function getFileContentGuardrails() {
    return (
        "\n\n--- FILE CONTENT & SECURITY GUARDRAILS ---\n" +
        "If you are generating a document or a spreadsheet, you MUST adhere to the following rules regarding its content:\n" +
        "1. CONCISENESS: The content must be highly concise, professional, and straight to the point. Avoid fluff, long-winded introductions, or unnecessary conversational filler.\n" +
        "2. NO SENSITIVE DATA OR RAW IDs: You must STRICTLY EXCLUDE any Personally Identifiable Information (PII) or sensitive data. Additionally, NEVER output raw database IDs, system UUIDs, or long alphanumeric hashes (e.g. 'cafaab15-5574...', '085d2ff5...'). Replace them with generic sequential names (e.g., 'Station 1', 'Location A') or omit the ID completely and just use the known place name.\n" +
        "3. STRUCTURAL CLARITY: Ensure the data is logically organized. If it's a document, use clear headings and bullet points. If it's a spreadsheet, ensure the chosen source table accurately represents the user's request without exposing protected columns.\n"
    )
}

// --- LantawSources: Fetch all context data ---
async function getAllContextData() {
    const results = {}

    try {
        const [inventory, weather, incidents, airQuality, distress, utilities] = await Promise.all([
            supabaseAdmin.from('pdrrmo_inventory').select('*').limit(15),
            supabaseAdmin.from('weather_telemetry').select('*').order('fetched_at', { ascending: false }).limit(10),
            supabaseAdmin.from('incident_report').select('*').order('created_at', { ascending: false }).limit(10),
            supabaseAdmin.from('air_quality').select('*').order('recorded_at', { ascending: false }).limit(10),
            supabaseAdmin.from('distress_signals').select('*').order('created_at', { ascending: false }).limit(10),
            supabaseAdmin.from('utilities').select('*').limit(15),
        ])

        results.pdrrmo_inventory_snapshot = inventory.data || []
        results.recent_weather = weather.data || []
        results.recent_incidents = incidents.data || []
        results.recent_air_quality = airQuality.data || []
        results.active_distress_signals = distress.data || []
        results.utilities_snapshot = utilities.data || []
    } catch (err) {
        console.error("Error fetching Lantaw sources:", err)
    }

    return results
}

// --- Gemini API call with backup model fallback ---
async function callGemini(prompt, model) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
            }
        })
    })

    if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Gemini API error (${model}): ${response.status} - ${errorBody}`)
    }

    const data = await response.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "I could not generate a response."
}

// --- Main API route handler ---
export async function POST(request) {
    try {
        const { prompt, conversationId, userId } = await request.json()

        if (!prompt || prompt.trim().length < 2) {
            return NextResponse.json({ error: "Prompt is too short." }, { status: 400 })
        }

        // Step 1: LantawThinking — Pre-filter (basic check)
        // Short queries are allowed through, the AI guardrails handle nuanced rejection

        // Step 2: LantawSources — Crawl the database for context
        const contextData = await getAllContextData()
        const contextString = JSON.stringify(contextData, null, 2)

        // Step 3: Build the full prompt using LantawPrompt structure
        const fullPrompt = [
            buildSystemPersona(),
            getGuardrails(),
            `\n--- CONTEXT DATA ---\n${contextString}`,
            getFormattingRules(),
            getChartInstructions(),
            getDocumentInstructions(),
            getSheetInstructions(),
            getFileContentGuardrails(),
            `\n--- USER QUERY ---\n${prompt.trim()}`
        ].join('\n')

        // Step 4: LantawConnect — Call Gemini with primary model, fallback to backup
        let aiResponse
        try {
            aiResponse = await callGemini(fullPrompt, PRIMARY_MODEL)
        } catch (primaryError) {
            console.warn(`Primary model (${PRIMARY_MODEL}) failed, falling back to ${BACKUP_MODEL}:`, primaryError.message)
            try {
                aiResponse = await callGemini(fullPrompt, BACKUP_MODEL)
            } catch (backupError) {
                console.error(`Backup model (${BACKUP_MODEL}) also failed:`, backupError.message)
                return NextResponse.json({ error: "Both AI models are currently unavailable. Please try again later." }, { status: 503 })
            }
        }

        // Step 5: LantawFormatting — Clean the output
        // Remove excessive newlines
        aiResponse = aiResponse.replace(/\n{3,}/g, '\n\n').trim()

        // Step 6: Save the interaction to ai_chatbot_conversation
        if (userId) {
            // Generate a title from the first prompt if this is a new conversation
            let title = prompt.trim().substring(0, 80)
            if (title.length >= 80) title += "..."

            await supabaseAdmin.from('ai_chatbot_conversation').insert({
                user_id: userId,
                user_prompt: prompt.trim(),
                ai_output: aiResponse,
                ai_source: 'FloodWatch Database Context',
                conversation_id: conversationId,
                conversation_title: title,
            })
        }

        return NextResponse.json({ response: aiResponse })
    } catch (err) {
        console.error("Lantaw API Error:", err)
        return NextResponse.json({ error: "An internal error occurred." }, { status: 500 })
    }
}
