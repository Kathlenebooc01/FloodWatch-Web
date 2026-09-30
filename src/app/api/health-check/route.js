import { NextResponse } from 'next/server';
import { logAiError, logAiSuccess } from '@/lib/logs/apiLogger';

export async function GET() {
    try {
        const model = process.env.GEMINI_LANTAW_MODEL || 'gemini-flash-latest';
        const primaryKey = process.env.GEMINI_LANTAW_AI;
        const backupKey = process.env.GEMINI_LANTAW_BACKUP_AI;

        if (!primaryKey && !backupKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const makeRequest = async (key) => {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            return await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "ping" }] }],
                    generationConfig: { maxOutputTokens: 5 }
                })
            });
        };

        let response = null;
        if (primaryKey) {
            response = await makeRequest(primaryKey);
        }

        // If primary key is missing, or if it failed with 429 Quota Exceeded, try the backup key
        if ((!response || response.status === 429) && backupKey && backupKey !== primaryKey) {
            console.log("Primary key quota exceeded. Switching to backup key...");
            response = await makeRequest(backupKey);
        }

        if (response.ok) {
            // Only log success if we actually passed the health check
            await logAiSuccess("Lantaw Health Check", "Automated system health check passed.");
            return NextResponse.json({ status: "Operational", message: "All systems normal" });
        } else {
            const errorBody = await response.text();
            // Don't overwhelm the logs, but update the status
            await logAiError("Lantaw Health Check", `Automated health check failed (${response.status}): ${errorBody}`);
            return NextResponse.json({ status: "Error", message: `API Error: ${response.status}` }, { status: 500 });
        }
    } catch (err) {
        await logAiError("Lantaw Health Check", `Network error: ${err.message}`);
        return NextResponse.json({ status: "Error", error: err.message }, { status: 500 });
    }
}
