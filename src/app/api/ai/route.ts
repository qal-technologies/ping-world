import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isRateLimited } from '@/lib/rate-limiter';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';

/**
 * jules edit: Server-side API handler for Gemini 2.5 Flash
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // Limit to 15 AI requests per minute (60000ms window) per client IP
    const { limited, remaining, reset } = isRateLimited(
      ip,
      'api:ai',
      15,
      60 * 1000,
    );

    if (limited) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '15',
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(reset),
          },
        },
      );
    }

    const requestUser = await getRequestUser(req);
    if (!requestUser) {
      return NextResponse.json({ error: 'Sign in to use AI tools.' }, { status: 401 });
    }
    if (isRateLimited(requestUser.id, 'api:ai-account', 15, 60 * 1000).limited) {
      return NextResponse.json({ error: 'AI request limit reached. Please try again later.' }, { status: 429 });
    }

    const body = await readJsonWithinLimit(req, 64 * 1024) as Record<string, unknown>;
    const {
      action,
      text,
      title,
      style,
      context,
      targetLanguageCode,
      targetLanguageName,
    } = body as any;
    if (Object.values(body).some((value) => typeof value === 'string' && value.length > 12_000)) {
      return NextResponse.json({ error: 'Request text is too long.' }, { status: 413 });
    }
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured on the server.' },
        { status: 400 },
      );
    }

    let prompt = '';

    if (action === 'hashtags') {
      prompt = `Generate a JSON array of maximum 7 highly relevant, high-performing hashtags for the following social media post text. Do not return any explanatory text or formatting outside of the valid JSON array of strings.
Post text: "${text}"`;
    } else if (action === 'rephrase') {
      prompt = `You are an expert social media copywriter. Rephrase the following social media post to match the "${style}" style, matching this context/preset: "${context}". Keep the tone engaging and stay within standard social media length guidelines. Return only the rephrased text with absolutely no other commentary.
Original text: "${text}"`;
    } else if (action === 'suggest') {
      prompt = `Generate exactly 3 highly engaging alternative social media post suggestions based on the topic/title: "${title}". Use the "${style}" style, matching this context/preset: "${context}". Return a JSON array of strings. Do not return any explanatory text or markdown formatting except the JSON array.`;
    } else if (action === 'translate') {
      prompt = `Translate the following text into ${targetLanguageName} (${targetLanguageCode}). Preserve formatting, emojis, and hashtags. Return only the translated text and nothing else.
Text: "${text}"`;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType:
              action === 'hashtags' || action === 'suggest' ?
                'application/json'
              : 'text/plain',
          },
        }),
      },
    );

    if (!response.ok) {
      console.error('[api/ai] Provider request failed:', response.status);
      return NextResponse.json({ error: 'AI provider request failed.' }, { status: 502 });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (action === 'hashtags') {
      try {
        const parsed = JSON.parse(resultText.trim());
        const tags = Array.isArray(parsed) ? parsed : [];
        return NextResponse.json({
          tags: tags.map((t: string) => ({
            tag: t.startsWith('#') ? t : `#${t}`,
            isPingWorld: false,
            source: 'ai',
          })),
        });
      } catch {
        return NextResponse.json({ tags: [] });
      }
    } else if (action === 'suggest') {
      try {
        const parsed = JSON.parse(resultText.trim());
        const suggestions = Array.isArray(parsed) ? parsed : [];
        return NextResponse.json({ suggestions });
      } catch {
        return NextResponse.json({ suggestions: [] });
      }
    } else if (action === 'rephrase') {
      return NextResponse.json({ result: resultText.trim() });
    } else if (action === 'translate') {
      return NextResponse.json({ translated: resultText.trim() });
    }

    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ error: 'Request is too large.' }, { status: 413 });
    }
    console.error('[api/ai] Request failed.');
    return NextResponse.json({ error: 'AI request failed.' }, { status: 500 });
  }
}
