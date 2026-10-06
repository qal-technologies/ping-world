import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';

interface PublishPayload {
  content: string;
  platforms: string[];
  mediaUrls?: string[];
  canvasBlobBase64?: string;
  hashtags?: string[];
}

interface PlatformResult {
  platform: string;
  success: boolean;
  status: 'published' | 'simulated' | 'failed' | 'rejected';
  postId?: string;
  url?: string;
  error?: string;
  note?: string;
}

// ── Policy Vetting & Anti-Abuse / Injection Guards ────────────────
function vetPostContent(platform: string, content: string, hasMedia: boolean): { valid: boolean; reason?: string } {
  // Check for dangerous scripting or injection patterns
  const suspiciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return { valid: false, reason: 'Content failed security vetting: prohibited script syntax detected.' };
    }
  }

  // Character length and platform rules
  const trimmed = content.trim();

  switch (platform) {
    case 'x':
    case 'twitter':
      if (trimmed.length === 0 && !hasMedia) {
        return { valid: false, reason: 'X (Twitter) posts require text or media.' };
      }
      if (trimmed.length > 280) {
        return { valid: false, reason: `X (Twitter) post exceeds 280 characters (${trimmed.length}/280).` };
      }
      break;

    case 'instagram':
      if (!hasMedia) {
        return { valid: false, reason: 'Instagram strictly requires an image or video canvas.' };
      }
      if (trimmed.length > 2200) {
        return { valid: false, reason: `Instagram caption exceeds 2,200 characters.` };
      }
      break;

    case 'facebook':
      if (trimmed.length === 0 && !hasMedia) {
        return { valid: false, reason: 'Facebook posts require text or media.' };
      }
      if (trimmed.length > 63206) {
        return { valid: false, reason: 'Facebook post exceeds maximum character limit.' };
      }
      break;

    case 'linkedin':
      if (trimmed.length === 0 && !hasMedia) {
        return { valid: false, reason: 'LinkedIn posts require text or media.' };
      }
      if (trimmed.length > 3000) {
        return { valid: false, reason: `LinkedIn post exceeds 3,000 characters (${trimmed.length}/3000).` };
      }
      break;
  }

  return { valid: true };
}

// ── Main Publish Handler ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (isRateLimited(ip, 'api:social-publish', 5, 60_000).limited) {
      return NextResponse.json({ success: false, error: 'Too many requests.' }, { status: 429 });
    }
    const requestUser = await getRequestUser(req);
    if (!requestUser) {
      return NextResponse.json({ success: false, error: 'Sign in to publish.' }, { status: 401 });
    }
    if (isRateLimited(requestUser.id, 'api:social-account', 5, 60_000).limited) {
      return NextResponse.json({ success: false, error: 'Publishing limit reached. Try again later.' }, { status: 429 });
    }
    const body = await readJsonWithinLimit(req, 2 * 1024 * 1024) as PublishPayload;
    const { content, platforms, mediaUrls = [], canvasBlobBase64, hashtags = [] } = body;

    const allowedPlatforms = new Set(['x', 'twitter', 'facebook', 'instagram', 'linkedin']);
    if (typeof content !== 'string' || content.length > 63_206 || !Array.isArray(platforms) || platforms.length === 0 || platforms.length > 4 || platforms.some((platform) => !allowedPlatforms.has(platform)) || !Array.isArray(mediaUrls) || !Array.isArray(hashtags) || hashtags.length > 30 || hashtags.some((tag) => typeof tag !== 'string' || tag.length > 100)) {
      return NextResponse.json(
        { success: false, error: 'At least one target social platform must be selected.' },
        { status: 400 }
      );
    }
    if (mediaUrls.length > 10 || mediaUrls.some((value) => {
      if (typeof value !== 'string' || value.length > 4096) return true;
      try { return new URL(value).protocol !== 'https:'; } catch { return true; }
    }) || (canvasBlobBase64 && canvasBlobBase64.length > 1_500_000)) {
      return NextResponse.json({ success: false, error: 'Invalid media payload.' }, { status: 400 });
    }

    const hasMedia = mediaUrls.length > 0 || !!canvasBlobBase64;
    const finalContent = [
      content.trim(),
      hashtags.length > 0 ? '\n\n' + hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ') : '',
    ]
      .join('')
      .trim();

    const results: PlatformResult[] = [];

    for (const platform of platforms) {
      // 1. Policy & Injection Vetting
      const vetting = vetPostContent(platform, finalContent, hasMedia);
      if (!vetting.valid) {
        results.push({
          platform,
          success: false,
          status: 'rejected',
          error: vetting.reason,
        });
        continue;
      }

      // 2. Dispatch to Platform Client with Environment Check
      try {
        if (platform === 'x' || platform === 'twitter') {
          const apiKey = process.env.TWITTER_API_KEY;
          const apiSecret = process.env.TWITTER_API_SECRET;
          const accessToken = process.env.TWITTER_ACCESS_TOKEN;
          const accessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

          if (apiKey && apiSecret && accessToken && accessSecret) {
            // Live X API v2 Call
            const res = await fetch('https://api.twitter.com/2/tweets', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN || accessToken}`,
              },
              body: JSON.stringify({ text: finalContent }),
            });
            const data = await res.json();
            if (res.ok && data?.data?.id) {
              results.push({
                platform: 'X (Twitter)',
                success: true,
                status: 'published',
                postId: data.data.id,
                url: `https://x.com/i/status/${data.data.id}`,
              });
            } else {
              results.push({
                platform: 'X (Twitter)',
                success: false,
                status: 'failed',
              error: 'Failed to publish to X. Check the connected account and try again.',
              });
            }
          } else {
            // Simulated Sandbox Fallback
            results.push({
              platform: 'X (Twitter)',
              success: true,
              status: 'simulated',
              postId: 'sim-x-' + Date.now(),
              note: 'Simulated sandbox post. Add TWITTER_API_KEY and TWITTER_ACCESS_TOKEN in .env for live posting.',
            });
          }
        } else if (platform === 'facebook') {
          const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
          const pageId = process.env.FACEBOOK_PAGE_ID;

          if (pageToken && pageId) {
            // Live Facebook Graph API Call
            const res = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/feed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pageToken}` },
              body: JSON.stringify({
                message: finalContent,
              }),
            });
            const data = await res.json();
            if (res.ok && data?.id) {
              results.push({
                platform: 'Facebook',
                success: true,
                status: 'published',
                postId: data.id,
                url: `https://facebook.com/${data.id}`,
              });
            } else {
              results.push({
                platform: 'Facebook',
                success: false,
                status: 'failed',
                error: 'Failed to publish to Facebook. Check the connected account and try again.',
              });
            }
          } else {
            // Simulated Sandbox Fallback
            results.push({
              platform: 'Facebook',
              success: true,
              status: 'simulated',
              postId: 'sim-fb-' + Date.now(),
              note: 'Simulated sandbox post. Add FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID in .env for live posting.',
            });
          }
        } else if (platform === 'instagram') {
          const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID;
          const igToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

          if (igAccountId && igToken && mediaUrls[0]) {
            // 1. Create Media Container
            const containerRes = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(igAccountId)}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${igToken}` },
              body: JSON.stringify({
                image_url: mediaUrls[0],
                caption: finalContent,
              }),
            });
            const containerData = await containerRes.json();

            if (containerRes.ok && containerData?.id) {
              // 2. Publish Media Container
              const pubRes = await fetch(`https://graph.facebook.com/v19.0/${encodeURIComponent(igAccountId)}/media_publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${igToken}` },
                body: JSON.stringify({
                  creation_id: containerData.id,
                }),
              });
              const pubData = await pubRes.json();
              if (pubRes.ok && pubData?.id) {
                results.push({
                  platform: 'Instagram',
                  success: true,
                  status: 'published',
                  postId: pubData.id,
                });
              } else {
                results.push({
                  platform: 'Instagram',
                  success: false,
                  status: 'failed',
                  error: 'Failed to publish to Instagram. Check the connected account and try again.',
                });
              }
            } else {
              results.push({
                platform: 'Instagram',
                success: false,
                status: 'failed',
                error: 'Could not prepare media for Instagram. Check the connected account and try again.',
              });
            }
          } else {
            // Simulated Sandbox Fallback
            results.push({
              platform: 'Instagram',
              success: true,
              status: 'simulated',
              postId: 'sim-ig-' + Date.now(),
              note: 'Simulated sandbox post with canvas image. Add INSTAGRAM_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN in .env for live posting.',
            });
          }
        } else if (platform === 'linkedin') {
          const linkedInToken = process.env.LINKEDIN_ACCESS_TOKEN;
          const authorUrn = process.env.LINKEDIN_AUTHOR_URN; // e.g. "urn:li:person:XXXXXX" or "urn:li:organization:XXXXXX"

          if (linkedInToken && authorUrn) {
            const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${linkedInToken}`,
                'X-Restli-Protocol-Version': '2.0.0',
              },
              body: JSON.stringify({
                author: authorUrn,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                  'com.linkedin.ugc.ShareContent': {
                    shareCommentary: { text: finalContent },
                    shareMediaCategory: 'NONE',
                  },
                },
                visibility: {
                  'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
                },
              }),
            });
            const data = await res.json();
            if (res.ok && data?.id) {
              results.push({
                platform: 'LinkedIn',
                success: true,
                status: 'published',
                postId: data.id,
              });
            } else {
              results.push({
                platform: 'LinkedIn',
                success: false,
                status: 'failed',
                error: 'Failed to publish to LinkedIn. Check the connected account and try again.',
              });
            }
          } else {
            // Simulated Sandbox Fallback
            results.push({
              platform: 'LinkedIn',
              success: true,
              status: 'simulated',
              postId: 'sim-li-' + Date.now(),
              note: 'Simulated sandbox post. Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN in .env for live posting.',
            });
          }
        }
      } catch {
        results.push({
          platform,
          success: false,
          status: 'failed',
          error: 'Platform connection failed. Try again later.',
        });
      }
    }

    const allSuccessful = results.every((r) => r.success);
    const anySimulated = results.some((r) => r.status === 'simulated');

    return NextResponse.json({
      success: allSuccessful,
      sandbox: anySimulated,
      results,
      summary: anySimulated
        ? 'Posts vetted and simulated in Sandbox Mode. To post live, provide your social API keys in environment settings.'
        : 'All social media posts were dispatched to their respective platform APIs.',
    });
  } catch {
    console.error('[/api/social/publish] Request failed.');
    return NextResponse.json(
      { success: false, error: 'Could not publish this post.' },
      { status: 500 }
    );
  }
}
