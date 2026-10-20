import { after, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAiError, logAiSuccess } from '@/lib/logs/apiLogger';
import { assessVerification, loadVerificationImage } from '@/lib/lantaw/id-verification.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.NEXT_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_API_KEY = process.env.GEMINI_LANTAW_AI;
const GEMINI_BACKUP_KEY = process.env.GEMINI_LANTAW_BACKUP_AI;
const GEMINI_THIRD_KEY = process.env.GEMINI_LANTAW_THIRD_AI;
const PRIMARY_MODEL = process.env.GEMINI_LANTAW_MODEL || 'gemini-3.1-flash-lite';
const BACKUP_MODEL = process.env.GEMINI_LANTAW_BACKUP_MODEL || 'gemini-3.5-flash-lite';
const THIRD_MODEL = process.env.GEMINI_LANTAW_THIRD_MODEL;

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

    if (!id_image_url) return NextResponse.json({ error: 'No ID image was submitted for analysis.' }, { status: 422 });
    const [idImage, selfieImage] = await Promise.all([
      loadVerificationImage(id_image_url, SUPABASE_URL, SUPABASE_SERVICE_KEY),
      loadVerificationImage(selfie_url, SUPABASE_URL, SUPABASE_SERVICE_KEY),
    ]);
    const prompt = `
You are Lantaw AI, the intelligent verification engine for the FloodWatch Disaster Management Platform.
Evaluate this citizen identity verification submission:
- User: ${userName || user_id || 'Citizen'}
- Claimed ID Type: ${id_type || 'Government ID'}
- ID Document Attached: Yes, in the next image.
- Selfie Attached: ${selfieImage ? 'Yes, in the final image.' : 'No'}

Analyze the submission according to Philippine government-issued ID standards and biometric fraud prevention guidelines:
1. Inspect the actual ID image for legibility and plausible document details. If a selfie is attached, compare only visible facial features; do not claim biometric certainty.
2. If images are blurry, incomplete, or inconclusive, flag for manual review. Never claim authenticity from appearance alone.
3. Provide a confidence score from 0 to 100 and a concise assessment explaining what is visible and any uncertainty.

Respond STRICTLY with a valid JSON object only:
{
  "ai_is_valid": true,
  "ai_confidence_score": 94,
  "ai_insight": "ID format is authentic and consistent with official standards. Clarity and facial alignment verified."
}
`;

    const parsed = await assessVerification(
      [{ text: prompt }, idImage, ...(selfieImage ? [selfieImage] : [])],
      { primaryKey: GEMINI_API_KEY, primaryModel: PRIMARY_MODEL, backupKey: GEMINI_BACKUP_KEY, backupModel: BACKUP_MODEL, thirdKey: GEMINI_THIRD_KEY, thirdModel: THIRD_MODEL },
    );

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
