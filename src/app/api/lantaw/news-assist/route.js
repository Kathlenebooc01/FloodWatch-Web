import { NextResponse } from 'next/server'
import { logAiError, logAiSuccess } from '@/lib/logs/apiLogger'
import { generateNewsFields, NEWS_ASSIST_ERROR } from '@/lib/lantaw/news-assist.mjs'

export const maxDuration = 60

export async function POST(request) {
  try {
    const { narration, existingFields = {} } = await request.json()
    if (typeof narration !== 'string' || narration.trim().length < 5) {
      return NextResponse.json({ error: 'Please provide a more detailed narration.' }, { status: 400 })
    }

    const primaryKey = process.env.GEMINI_LANTAW_AI
    const backupKey = process.env.GEMINI_LANTAW_BACKUP_AI || primaryKey
    const thirdKey = process.env.GEMINI_LANTAW_THIRD_AI || backupKey
    if (!primaryKey && !backupKey && !thirdKey) {
      await logAiError('Lantaw News Assist', 'Gemini key is not configured')
      return NextResponse.json({ error: NEWS_ASSIST_ERROR }, { status: 503 })
    }

    const primaryModel = process.env.GEMINI_LANTAW_MODEL || 'gemini-3.1-flash-lite'
    const backupModel = process.env.GEMINI_LANTAW_BACKUP_MODEL || 'gemini-3.5-flash-lite'
    const thirdModel = process.env.GEMINI_LANTAW_THIRD_MODEL
    const attempts = [
      { model: primaryModel, key: primaryKey || backupKey },
      { model: backupModel, key: backupKey || primaryKey },
      ...(thirdModel ? [{ model: thirdModel, key: thirdKey }] : []),
    ].filter((attempt, index, all) => attempt.model && attempt.key &&
      all.findIndex(other => other.model === attempt.model) === index)

    const requested = {
      headline: !existingFields?.headline?.trim(),
      tag: !(Array.isArray(existingFields?.tag) ? existingFields.tag.length : existingFields?.tag?.trim()),
      referenceLink: !existingFields?.referenceLink?.trim(),
      detailedContent: !existingFields?.detailedContent?.trim(),
    }
    if (!requested.headline && !requested.detailedContent && !requested.tag && !requested.referenceLink) {
      return NextResponse.json({ fields: {} })
    }

    const prompt = [
      'You are Lantaw AI drafting a news board report for FloodWatch Cebu.',
      'Use only facts explicitly stated in the Provincial Admin narration. Do not invent casualties, evacuation counts, damage estimates, official statements, locations, or response actions.',
      'Write a clear professional headline and an organized report with introduction, incident details, known impacts and response activity, and a concluding statement when those details are available.',
      'If a detail is unknown, omit it. Do not imply that a report is verified unless the narration says so.',
      'Return only a valid JSON object. No markdown or commentary. Include only requested fields.',
      `Requested fields: ${JSON.stringify(requested)}. For tag, use one relevant word. For referenceLink, use an empty string; never invent a URL.`,
      `Existing fields to preserve: ${JSON.stringify(existingFields)}`,
      `Provincial Admin narration: ${narration.trim()}`,
    ].join('\n')

    const startedAt = Date.now()
    const result = await generateNewsFields({ prompt, existingFields, attempts })
    await logAiSuccess('Lantaw News Assist', `Drafted news board article with ${result.model} | LATENCY:${Date.now() - startedAt}ms`)
    return NextResponse.json({ fields: result.fields })
  } catch (error) {
    console.error('Lantaw News Assist failed:', error.message)
    await logAiError('Lantaw News Assist', `Generation failed: ${error.message}`)
    return NextResponse.json({ error: NEWS_ASSIST_ERROR }, { status: 503 })
  }
}
