import { NextResponse } from 'next/server';
import { logApiActivity } from '@/lib/logs/apiLogger';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      apiType = 'mapbox',
      eventType = 'Execution',
      message = 'Operation executed successfully',
      isError = false,
      status = null,
      errorMessage = null
    } = body;

    await logApiActivity({
      apiType,
      eventType,
      message,
      isError,
      status,
      errorMessage
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error in /api/logs/track:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
