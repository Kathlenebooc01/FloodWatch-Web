import { NextResponse } from 'next/server';
import { authorizeApiRequest } from '@/lib/auth/authorizeApiRequest.mjs';

export async function GET(request) {
  const auth = await authorizeApiRequest(request, ['national_admin']);
  if (auth.response) return auth.response;
  return NextResponse.json({ error: 'Boundary seeding is disabled.' }, { status: 410 });
}
