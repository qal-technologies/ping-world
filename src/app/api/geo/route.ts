import { NextRequest, NextResponse } from 'next/server';
import { getCountryByCode } from '@/lib/countries/countries-data';

export const dynamic = 'force-dynamic';

/** Return only the hosting edge's country estimate; no IP address is stored. */
export async function GET(request: NextRequest) {
  const code = (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    ''
  ).trim().toUpperCase();
  const country = code && code !== 'XX' ? getCountryByCode(code) : undefined;
  return NextResponse.json({
    country: country?.name || 'Unknown',
    countryCode: country?.code,
    continent: country?.region || 'Unknown',
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
