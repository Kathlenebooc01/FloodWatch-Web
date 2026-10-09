import { after, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAiError, logAiSuccess } from '@/lib/logs/apiLogger';
import { generateChatAnswer } from '@/lib/lantaw/chat-provider.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.NEXT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_LANTAW_AI;
const GEMINI_BACKUP_KEY = process.env.GEMINI_LANTAW_BACKUP_AI || process.env.GEMINI_LANTAW_AI;
const PRIMARY_MODEL = process.env.GEMINI_LANTAW_MODEL || 'gemini-3.1-flash-lite';
const BACKUP_MODEL = process.env.GEMINI_LANTAW_BACKUP_MODEL || 'gemini-3.1-flash-lite';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(request) {
  const startTime = Date.now();
  try {
    const { id_verification_id } = await request.json();
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token || !id_verification_id) return NextResponse.json({ error: 'Authentication and verification ID required' }, { status: 401 });
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    const [{ data: profile }, { data: submission, error: submissionError }] = await Promise.all([
      supabaseAdmin.from('profiles').select('role').eq('id', user.id).single(),
      supabaseAdmin.from('id_verification')
        .select('user_id, id_type, id_image_url, selfie_url').eq('id_verification_id', id_verification_id).single(),
    ]);
    if (submissionError || !submission || (profile?.role !== 'national_admin' && submission.user_id !== user.id)) {
      return NextResponse.json({ error: 'Verification request unavailable' }, { status: 403 });
    }
    const { user_id, id_type, id_image_url, selfie_url } = submission;
    const userName = null;

    if (!GEMINI_API_KEY && !GEMINI_BACKUP_KEY) {
      const msg = "GEMINI_LANTAW_AI API key is missing in environment.";
      await logAiError("Lantaw Verification", msg);
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    const prompt = `
You are Lantaw AI, the intelligent verification engine for the FloodWatch Disaster Management Platform.
Evaluate this citizen identity verification submission:
- User: ${userName || user_id || 'Citizen'}
- Claimed ID Type: ${id_type || 'Government ID'}
- ID Document Attached: ${id_image_url ? 'Yes (' + id_image_url + ')' : 'No'}
- Biometric Selfie Attached: ${selfie_url ? 'Yes (' + selfie_url + ')' : 'No'}

Analyze the submission according to Philippine government-issued ID standards and biometric fraud prevention guidelines:
1. Determine if the document format and provided credentials are plausible and valid.
2. Estimate a confidence score between 75 and 99% if valid (or below 50% if suspicious/missing).
3. Provide a concise, professional 1-2 sentence assessment insight.

Respond STRICTLY with a valid JSON object only:
{
  "ai_is_valid": true,
  "ai_confidence_score": 94,
  "ai_insight": "ID format is authentic and consistent with official standards. Clarity and facial alignment verified."
}
`;

    const rawResponse = await generateChatAnswer(prompt, {
      model: PRIMARY_MODEL,
      apiKey: GEMINI_API_KEY,
      backupKey: GEMINI_BACKUP_KEY,
      backupModel: BACKUP_MODEL,
      json: true,
      maxOutputTokens: 256,
    });

    let parsed = null;
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse Gemini verification JSON:", e);
    }

    if (!parsed || typeof parsed.ai_is_valid !== 'boolean' || !Number.isFinite(Number(parsed.ai_confidence_score)) || typeof parsed.ai_insight !== 'string') {
      return NextResponse.json({ error: 'AI analysis did not return a valid assessment' }, { status: 502 });
    }

    const latency = Date.now() - startTime;
    const targetUser = userName || (user_id ? String(user_id).slice(0, 8) : 'User');

    // Attempt updating id_verification row with AI fields if present
    if (id_verification_id) {
      try {
        const { error: dbError } = await supabaseAdmin
          .from('id_verification')
          .update({
            ai_is_valid: parsed.ai_is_valid,
            ai_confidence_score: parsed.ai_confidence_score,
            ai_insight: parsed.ai_insight
          })
          .eq('id_verification_id', id_verification_id);
        if (dbError) throw dbError;
      } catch (dbErr) {
        return NextResponse.json({ error: 'Unable to save AI assessment' }, { status: 500 });
      }
    }

    // Automatically record Lantaw AI execution in api_activity_logs & api_monitoring!
    after(() => logAiSuccess(
      "Lantaw Verification",
      `Analyzed ID verification for ${targetUser} (${id_type || 'ID'}) - Result: ${parsed.ai_is_valid ? 'Valid Format' : 'Flagged'}, Confidence: ${parsed.ai_confidence_score}% | STATUS:200 | LATENCY:${latency}ms`
    ));

    return NextResponse.json({
      success: true,
      ...parsed,
      latency
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error("Lantaw verification failed:", error);
    after(() => logAiError("Lantaw Verification", `${error.message || error} | LATENCY:${latency}ms`));
    return NextResponse.json({ error: error.message || "Verification AI failed" }, { status: 503 });
  }
}
