import { NextRequest, NextResponse } from 'next/server';
import { DevEngineRegistry } from '@/lib/dev-engines';
import { PremiumTier } from '@/lib/config/premium';
import { isRateLimited, getClientIp } from '@/lib/rate-limiter';
import { sanitizeInput } from '@/lib/general/sanitize';
import { AiQuotaSyncer } from '@/lib/general/ai-quota-syncer';
import { getRequestUser, readJsonWithinLimit } from '@/lib/api-auth';

export const runtime = 'edge';

const blockedMethodNames = new Set(['constructor', '__proto__', 'prototype', 'toString', 'valueOf']);
const privateOrRiskyEngines = new Set(['secure-state', 'session-engine', 'recaller']);
function isCallableEngineMethod(engine: Record<string, any>, method: string) {
  if (blockedMethodNames.has(method)) return false;
  const prototype = Object.getPrototypeOf(engine);
  return typeof engine[method] === 'function' && (
    Object.hasOwn(engine, method) || (prototype && prototype !== Object.prototype && Object.hasOwn(prototype, method))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ apiId: string }> },
) {
  const startTime = Date.now();
  try {
    const { apiId } = await params;
    const engine = DevEngineRegistry[apiId];

    if (!engine) {
      return NextResponse.json(
        {
          success: false,
          error: `API Tool '${apiId}' not found. Available tools: ${Object.keys(DevEngineRegistry).join(', ')}`,
        },
        { status: 404 },
      );
    }

    if (privateOrRiskyEngines.has(apiId)) return NextResponse.json({ success: false, error: 'This stateful API is not exposed through the public developer endpoint.' }, { status: 403 });
    let userTier: PremiumTier = 'free';
    const user = await getRequestUser(request);

    const parsed = await readJsonWithinLimit(request, 64 * 1024);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json({ success: false, error: 'Invalid request body.' }, { status: 400 });
    }
    const body = parsed as Record<string, any>;
    const method = typeof body.method === 'string' ? body.method : typeof body.action === 'string' ? body.action : 'analyze';
    if (!/^[a-zA-Z][\w]*$/.test(method)) {
      return NextResponse.json({ success: false, error: 'Invalid API method.' }, { status: 400 });
    }

    const isAiCall = apiId === 'tone-correction' || apiId === 'autocorrect' || method === 'translate' || method === 'suggest';
    if (isAiCall) {
      const quota = AiQuotaSyncer.checkQuota(userTier);
      if (!quota.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Daily AI Quota exceeded for tier '${userTier.toUpperCase()}'. Allowed: ${quota.limit} calls/day. Please upgrade your plan to increase limits.`,
          },
          { status: 429 }
        );
      }
      AiQuotaSyncer.incrementLocalCount();
    }

    // Enforce dynamic server-side rate limits based on premium.ts tier settings
    const rpmLimit = isAiCall ? 20 : 120;

    const clientIp = getClientIp(request);
    const rateCheck = isRateLimited(clientIp, `api_call_${apiId}`, rpmLimit, 60 * 1000);
    const accountRateCheck = user ? isRateLimited(user.id, `api_call_account_${apiId}`, rpmLimit, 60 * 1000) : { limited: false, remaining: rpmLimit, reset: Date.now() + 60_000 };

    if (rateCheck.limited || accountRateCheck.limited) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded for tier '${userTier.toUpperCase()}'. Allowed: ${rpmLimit} req/min. Please upgrade your subscription plan to increase limits.`,
          resetTime: new Date(rateCheck.reset).toISOString(),
        },
        { status: 429 }
      );
    }

    if (apiId === 'styling-engine' && method === 'script') {
      const css = engine.generateCSS(body.config || {});
      const scriptContent = `(function(){const s=document.createElement('style');s.id='pingworld_injected_styles';s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();`;
      return new Response(scriptContent, {
        headers: {
          'content-type': 'application/javascript',
          'cache-control': 'public, max-age=3600',
        },
      });
    }

    if (!isCallableEngineMethod(engine, method)) {
      return NextResponse.json(
        {
          success: false,
          error: `Method '${method}' does not exist on API '${apiId}'.`,
        },
        { status: 400 },
      );
    }

    // Pass args array or named params dynamically
    const args = Array.isArray(body.args) 
      ? body.args 
      : body.data !== undefined 
        ? [body.data, body.params || body.options || body.config || body.targetTone || body.key || body.type].filter(x => x !== undefined)
        : [body];

   const sanitizedArgs = args.map((arg: any) => sanitizeInput(arg));

    const result = await engine[method](...sanitizedArgs);

    return NextResponse.json({
      success: true,
      apiId,
      method,
      data: result,
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      remainingQuota: rateCheck.remaining,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      return NextResponse.json({ success: false, error: 'Request is too large.' }, { status: 413 });
    }
    console.error('[api/call] Engine request failed.');
    return NextResponse.json(
      {
        success: false,
        error: 'API execution failed.',
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ apiId: string }> },
) {
  const startTime = Date.now();
  try {
    const { apiId } = await params;
    const engine = DevEngineRegistry[apiId];

    if (!engine) {
      return NextResponse.json(
        { success: false, error: `API Tool '${apiId}' not found.` },
        { status: 404 },
      );
    }

    if (privateOrRiskyEngines.has(apiId)) return NextResponse.json({ success: false, error: 'This stateful API is not exposed through the public developer endpoint.' }, { status: 403 });
    let userTier: PremiumTier = 'free';
    const user = await getRequestUser(request);
    const rpmLimit = apiId === 'tone-correction' || apiId === 'autocorrect' ? 20 : 120;

    const clientIp = getClientIp(request);
    const rateCheck = isRateLimited(clientIp, `api_call_get_${apiId}`, rpmLimit, 60 * 1000);
    const accountRateCheck = user ? isRateLimited(user.id, `api_call_get_account_${apiId}`, rpmLimit, 60 * 1000) : { limited: false, remaining: rpmLimit, reset: Date.now() + 60_000 };

    if (rateCheck.limited || accountRateCheck.limited) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded for tier '${userTier.toUpperCase()}'. Allowed: ${rpmLimit} req/min.`,
          resetTime: new Date(rateCheck.reset).toISOString(),
        },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const method =
      searchParams.get('method') ||
      searchParams.get('action') ||
      'getAllCountries';

    if (apiId === 'styling-engine' && method === 'script') {
      const css = engine.generateCSS({});
      const scriptContent = `(function(){const s=document.createElement('style');s.id='pingworld_injected_styles';s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();`;
      return new Response(scriptContent, {
        headers: {
          'content-type': 'application/javascript',
          'cache-control': 'public, max-age=86400',
        },
      });
    }

    if (!/^[a-zA-Z][\w]*$/.test(method) || !isCallableEngineMethod(engine, method)) {
      return NextResponse.json(
        {
          success: false,
          error: `Method '${method}' does not exist on API '${apiId}'.`,
        },
        { status: 400 },
      );
    }

    const paramInput = searchParams.get('data') || searchParams.get('text') || searchParams.get('query') || searchParams.get('code') || searchParams.get('color');
    const secondaryInput = searchParams.get('param') || searchParams.get('tone') || searchParams.get('targetTone');
    if ([paramInput, secondaryInput].some((value) => value && value.length > 12_000)) {
      return NextResponse.json({ success: false, error: 'Request text is too long.' }, { status: 413 });
    }

    const args = [paramInput, secondaryInput].filter(Boolean);
    const sanitizedArgs = args.map((arg: any) => sanitizeInput(arg));
    const result = await engine[method](...sanitizedArgs);

    return NextResponse.json({
      success: true,
      apiId,
      method,
      data: result,
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      remainingQuota: rateCheck.remaining,
    });
  } catch (error) {
    console.error('[api/call] Engine request failed.');
    return NextResponse.json(
      {
        success: false,
        error: 'API execution failed.',
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}
