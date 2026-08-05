import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // 1. Fetch short link details
    const { data: link, error } = await supabase
      .from('short_links')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !link) {
      return NextResponse.redirect(new URL('/not-found', request.url));
    }

    // Check expiration
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response('This shortened URL has expired.', { status: 410 });
    }

    // 2. Resolve visitor metadata
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
    const city = request.headers.get('x-vercel-ip-country-city') || 'Unknown';
    const referrer = request.headers.get('referer') || 'Direct';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const newClick = {
      clicked_at: new Date().toISOString(),
      country,
      city,
      referrer,
      userAgent,
    };

    const currentClicksData = Array.isArray(link.clicks_data) ? link.clicks_data : [];
    const updatedClicksData = [...currentClicksData, newClick];
    const newClicksCount = (link.clicks || 0) + 1;

    // 3. Update clicks & metadata in DB
    await supabase
      .from('short_links')
      .update({
        clicks: newClicksCount,
        clicks_data: updatedClicksData,
      })
      .eq('id', id);

    // 4. Redirect to original target URL
    let target = link.original_url;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://' + target;
    }

    return NextResponse.redirect(new URL(target));
  } catch (err) {
    console.error('[Redirect Error]:', err);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
