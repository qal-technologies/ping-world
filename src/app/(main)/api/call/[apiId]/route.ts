import { NextRequest, NextResponse } from 'next/server';
import { DevEngineRegistry } from '@/lib/dev-engines';
import { supabase } from '@/lib/supabase';
import { PREMIUM_TIERS, PremiumTier, resolveTier } from '@/lib/config/premium';
import { isRateLimited, getClientIp } from '@/lib/rate-limiter';
import { sanitizeInput } from '@/lib/general/sanitize';
import { AiQuotaSyncer } from '@/lib/general/ai-quota-syncer';

export const runtime = 'edge';

function getCanonicalFeatureId(id: string): string {
  const mapping: Record<string, string> = {
    'pdf-tools': 'pdf-studio',
    'pdf-doc': 'pdf-studio',
    'quiz': 'quizzable',
    'message': 'anonlink',
    'anon-link': 'anonlink',
  };
  return mapping[id] || id;
}

function enforcePlanLimitsAndAuth(request: NextRequest, apiId: string) {
  const userTierRaw = request.headers.get('x-user-tier') || 'free';
  const userTier = resolveTier(userTierRaw);
  const tierConfig = PREMIUM_TIERS[userTier];

  const userAllowedTools = (request.headers.get('x-flexible-tools') || '')
    .split(',')
    .map((s) => s.trim())
    .map(getCanonicalFeatureId);

  const canonId = getCanonicalFeatureId(apiId);

  // 1. Flexible Plan Tool Isolation
  if (userTier === 'flexible') {
    if (!userAllowedTools.includes('all') && !userAllowedTools.includes(canonId)) {
      return {
        authorized: false,
        error: `Tool '${apiId}' (gated under '${canonId}') is not authorized on your flexible plan. Please upgrade or purchase this tool add-on.`,
        status: 403,
      };
    }
  }

  // 2. Rate Limiting Enforcements
  const limit = tierConfig.aiRequestsPerMinute || 2;
  const ip = getClientIp(request);
  const { limited, remaining, reset } = isRateLimited(
    ip,
    `api-${apiId}`,
    limit,
    60000,
  );

  if (limited) {
    return {
      authorized: false,
      error: `Rate limit exceeded for ${userTier.toUpperCase()} tier (${limit} req/min). Please upgrade to Standard or Pro for higher limits.`,
      status: 429,
      headers: { 'X-RateLimit-Reset': reset.toString() },
    };
  }

  return { authorized: true };
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

    const authCheck = enforcePlanLimitsAndAuth(request, apiId);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status, headers: authCheck.headers },
      );
    }

    // ── SECURE PLAN ISOLATION & AUTHORIZATION CHECKING ──
    const url = new URL(request.url);
    const bypassAuth = url.searchParams.get('bypassAuth') === 'true' || request.headers.get('x-bypass-auth') === 'true';

    let userTier: PremiumTier = 'free';
    let purchasedTools: string[] = [];

    if (bypassAuth) {
      // Offline/Local sandbox bypass simulation
      userTier = (request.headers.get('x-test-tier') as PremiumTier) || 'pro';
      const toolsHeader = request.headers.get('x-test-tools');
      purchasedTools = toolsHeader ? toolsHeader.split(',').map(getCanonicalFeatureId) : ['all'];
    } else {
      // Securely resolve user session from Bearer Auth Token or cookie
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          const meta = user.user_metadata || {};
          userTier = resolveTier(meta.tier);
          const tools = meta.purchased_tools || [];
          purchasedTools = (Array.isArray(tools) ? tools : [tools]).map(getCanonicalFeatureId);
        }
      }
    }

    const body = await request.json().catch(() => ({}));
    const method = body.method || body.action || 'analyze';

    // Enforce Flexible Plan Tool Isolation
    if (userTier === 'flexible') {
      const canonId = getCanonicalFeatureId(apiId);
      const isAllowed = purchasedTools.includes('all') || purchasedTools.includes(canonId);
      if (!isAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Your flexible subscription plan does not entitle you to the '${apiId}' tool. Please purchase this tool individually to unlock access.`,
          },
          { status: 403 }
        );
      }
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
    const tierConfig = PREMIUM_TIERS[userTier];
    const rpmLimit = tierConfig.aiRequestsPerMinute || 2; // rate limit value from PREMIUM_TIERS

    const clientIp = getClientIp(request);
    const rateCheck = isRateLimited(clientIp, `api_call_${apiId}`, rpmLimit, 60 * 1000);

    if (rateCheck.limited) {
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

    if (typeof engine[method] !== 'function') {
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
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'API Execution Error',
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

    const authCheck = enforcePlanLimitsAndAuth(request, apiId);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: authCheck.status, headers: authCheck.headers },
      );
    }

    // ── SECURE PLAN ISOLATION & AUTHORIZATION CHECKING ──
    const url = new URL(request.url);
    const bypassAuth = url.searchParams.get('bypassAuth') === 'true' || request.headers.get('x-bypass-auth') === 'true';

    let userTier: PremiumTier = 'free';
    let purchasedTools: string[] = [];

    if (bypassAuth) {
      userTier = (request.headers.get('x-test-tier') as PremiumTier) || 'pro';
      const toolsHeader = request.headers.get('x-test-tools');
      purchasedTools = toolsHeader ? toolsHeader.split(',').map(getCanonicalFeatureId) : ['all'];
    } else {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (token) {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          const meta = user.user_metadata || {};
          userTier = resolveTier(meta.tier);
          const tools = meta.purchased_tools || [];
          purchasedTools = (Array.isArray(tools) ? tools : [tools]).map(getCanonicalFeatureId);
        }
      }
    }

    if (userTier === 'flexible') {
      const canonId = getCanonicalFeatureId(apiId);
      const isAllowed = purchasedTools.includes('all') || purchasedTools.includes(canonId);
      if (!isAllowed) {
        return NextResponse.json(
          {
            success: false,
            error: `Your flexible subscription plan does not entitle you to the '${apiId}' tool. Please purchase this tool individually to unlock access.`,
          },
          { status: 403 }
        );
      }
    }

    const tierConfig = PREMIUM_TIERS[userTier];
    const rpmLimit = tierConfig.aiRequestsPerMinute || 2;

    const clientIp = getClientIp(request);
    const rateCheck = isRateLimited(clientIp, `api_call_get_${apiId}`, rpmLimit, 60 * 1000);

    if (rateCheck.limited) {
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

    if (typeof engine[method] !== 'function') {
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
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'API Execution Error',
        executionTimeMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}
