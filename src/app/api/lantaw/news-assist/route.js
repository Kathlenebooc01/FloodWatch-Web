import { NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_LANTAW_AI
const PRIMARY_MODEL = process.env.GEMINI_LANTAW_MODEL || 'gemini-3.5-flash'
const BACKUP_MODEL = process.env.GEMINI_LANTAW_BACKUP_MODEL || 'gemini-2.5-flash'

// --- LantawThinking: Guardrails ---
function getGuardrails() {
    return (
        "\n\n--- STRICT DOMAIN RESTRICTIONS & GUARDRAILS ---\n" +
        "1. NO WEB SEARCHING: You do not have internet access.\n" +
        "2. CREATIVE AND GUIDANCE EXCEPTIONS: You ARE allowed to use your internal reasoning to generate content such as drafting news reports, writing professional articles, and expanding short narrations into full stories.\n" +
        "3. DENIAL OF UNRELATED QUERIES: If the user's narration is completely nonsense or off-topic, return a JSON with an 'error' field explaining you are Lantaw AI.\n" +
        "4. NO HALLUCINATIONS: Do not invent specific data, sensor readings, or statistics not mentioned by the user."
    )
}

// --- LantawPrompt: Build the system persona ---
function buildSystemPersona() {
    return (
        "You are Lantaw AI, the intelligent assistant for the FloodWatch Disaster Management Platform. " +
        "You are helping a Provincial Admin write a news board article. " +
        "Be direct, professional, and produce high-quality news writing."
    )
}

// --- LantawNewsAssist: News field generation instructions ---
function getNewsAssistInstructions(existingFields) {
    const fieldsToGenerate = []
    const skipInfo = []

    if (!existingFields?.headline?.trim()) {
        fieldsToGenerate.push('"headline": "A concise, professional headline for the news article"')
    } else {
        skipInfo.push(`- headline is already set to: "${existingFields.headline}"`)
    }

    const hasTags = Array.isArray(existingFields?.tag) 
        ? existingFields.tag.length > 0 
        : !!existingFields?.tag?.trim()

    if (!hasTags) {
        fieldsToGenerate.push('"tag": "A single relevant one-word category tag (e.g. Flood, Storm, Rescue, Weather, Alert, Emergency)"')
    } else {
        const tagText = Array.isArray(existingFields.tag) ? existingFields.tag.join(', ') : existingFields.tag
        skipInfo.push(`- tag is already set to: "${tagText}"`)
    }

    if (!existingFields?.referenceLink?.trim()) {
        fieldsToGenerate.push('"referenceLink": "Leave as empty string since you cannot generate real URLs"')
    } else {
        skipInfo.push(`- referenceLink is already set to: "${existingFields.referenceLink}"`)
    }

    if (!existingFields?.detailedContent?.trim()) {
        fieldsToGenerate.push('"detailedContent": "A well-written, professional, detailed news report (2-4 paragraphs) expanding on the narration"')
    } else {
        skipInfo.push(`- detailedContent is already set to: "${existingFields.detailedContent}"`)
    }

    const fieldsJson = fieldsToGenerate.join(",\n  ")
    const skipText = skipInfo.length > 0 ? skipInfo.join("\n") : "None — all fields need to be generated."

    return (
        "\n\n--- NEWS ASSIST INSTRUCTIONS ---\n" +
        "You are helping a Provincial Admin write a news board article for the FloodWatch platform.\n" +
        "The admin has provided a short narration or summary of the event. Your task is to generate " +
        "structured content to fill in the news form.\n\n" +
        "IMPORTANT RULES:\n" +
        "1. Return ONLY a valid raw JSON object. No markdown, no code blocks, no conversational text.\n" +
        "2. The JSON must contain ONLY the fields that need to be generated (listed below).\n" +
        "3. Do NOT include fields that are already filled in.\n" +
        "4. The 'detailedContent' should be a professional, well-structured news report.\n" +
        "5. The 'headline' should be concise and attention-grabbing but professional.\n" +
        "6. The 'tag' must be exactly ONE word — a category label.\n" +
        "7. The 'referenceLink' should always be an empty string since you cannot generate real URLs.\n" +
        "8. Do NOT hallucinate specific data, locations, or statistics not mentioned in the narration.\n\n" +
        `FIELDS ALREADY FILLED (SKIP THESE):\n${skipText}\n\n` +
        `FIELDS TO GENERATE (include ONLY these in your JSON):\n{\n  ${fieldsJson}\n}\n`
    )
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
                maxOutputTokens: 2048,
            }
        })
    })

    if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Gemini API error (${model}): ${response.status} - ${errorBody}`)
    }

    const data = await response.json()
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || ""
}

// --- Main API route handler ---
export async function POST(request) {
    try {
        const { narration, existingFields } = await request.json()

        if (!narration || narration.trim().length < 5) {
            return NextResponse.json({ error: "Please provide a more detailed narration." }, { status: 400 })
        }

        // Step 1: LantawThinking — Pre-filter
        const queryLower = narration.toLowerCase()
        const domainKeywords = [
            "flood", "weather", "rain", "temperature", "wind", "storm", "typhoon", "water",
            "level", "alert", "distress", "emergency", "incident", "hazard", "report",
            "rescue", "help", "generate", "write", "news", "update", "advisory",
            "evacuation", "damage", "casualty", "relief", "disaster"
        ]

        // Allow short narrations through, check longer ones
        if (narration.split(' ').length > 3) {
            const hasRelevantKeyword = domainKeywords.some(word => queryLower.includes(word))
            if (!hasRelevantKeyword) {
                return NextResponse.json({
                    error: "Your narration doesn't seem related to disaster management or news reporting. Please provide a relevant event description."
                }, { status: 400 })
            }
        }

        // Step 2: Build the full prompt (LantawPrompt + LantawThinking + LantawNewsAssist)
        const fullPrompt = [
            buildSystemPersona(),
            getGuardrails(),
            getNewsAssistInstructions(existingFields || {}),
            `\n--- ADMIN'S NARRATION ---\n${narration.trim()}`
        ].join('\n')

        // Step 3: LantawConnect — Call Gemini with primary model, fallback to backup
        let aiResponse
        try {
            aiResponse = await callGemini(fullPrompt, PRIMARY_MODEL)
        } catch (primaryError) {
            console.warn(`Primary model (${PRIMARY_MODEL}) failed, falling back to ${BACKUP_MODEL}:`, primaryError.message)
            try {
                aiResponse = await callGemini(fullPrompt, BACKUP_MODEL)
            } catch (backupError) {
                console.error(`Backup model (${BACKUP_MODEL}) also failed:`, backupError.message)
                return NextResponse.json({ error: "AI models are currently unavailable. Please try again later." }, { status: 503 })
            }
        }

        // Step 4: Clean and parse the JSON response
        // Strip markdown code block wrappers if present
        let cleanedResponse = aiResponse.trim()
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')

        try {
            const parsedFields = JSON.parse(cleanedResponse)
            return NextResponse.json({ fields: parsedFields })
        } catch (parseError) {
            console.error("Failed to parse Lantaw news assist response:", cleanedResponse)
            return NextResponse.json({
                error: "Lantaw generated a response but it couldn't be parsed. Please try again."
            }, { status: 500 })
        }

    } catch (err) {
        console.error("Lantaw News Assist API Error:", err)
        return NextResponse.json({ error: "An internal error occurred." }, { status: 500 })
    }
}
