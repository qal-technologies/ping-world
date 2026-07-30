import { NextRequest, NextResponse } from 'next/server';
import { DevEngineRegistry } from '@/lib/dev-engines';
import { PREMIUM_TIERS, resolveTier } from '@/lib/config/premium';
import { isRateLimited, getClientIp } from '@/lib/rate-limiter';

export const runtime = 'edge';

function enforcePlanLimitsAndAuth(request: NextRequest, apiId: string) {
  // In a real application, these values would be extracted from a verified JWT or server-to-server middleware header
  const userTierRaw = request.headers.get('x-user-tier') || 'free';
  const userTier = resolveTier(userTierRaw);
  const tierConfig = PREMIUM_TIERS[userTier];

  const userAllowedTools = (request.headers.get('x-flexible-tools') || '')
    .split(',')
    .map((s) => s.trim());

  // 1. Flexible Plan Tool Isolation
  if (userTier === 'flexible') {
    if (!userAllowedTools.includes(apiId)) {
      return {
        authorized: false,
        error: `Tool '${apiId}' is not authorized on your flexible plan. Please upgrade or purchase this tool add-on.`,
        status: 403,
      };
    }
  }

  // 2. Rate Limiting Enforcements
  const limit = tierConfig.aiRequestsPerMinute;
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

    const body = await request.json().catch(() => ({}));
    const method = body.method || body.action || 'analyze';

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

    const args =
      Array.isArray(body.args) ? body.args
      : body.data !== undefined ?
        [
          body.data,
          body.params ||
            body.options ||
            body.config ||
            body.targetTone ||
            body.key ||
            body.type,
        ].filter((x) => x !== undefined)
      : [body];

    const result = await engine[method](...args);

    return NextResponse.json({
      success: true,
      apiId,
      method,
      data: result,
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
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

    const paramInput =
      searchParams.get('data') ||
      searchParams.get('text') ||
      searchParams.get('query') ||
      searchParams.get('code') ||
      searchParams.get('color');
    const secondaryInput =
      searchParams.get('param') ||
      searchParams.get('tone') ||
      searchParams.get('targetTone');

    const args = [paramInput, secondaryInput].filter(Boolean);
    const result = await engine[method](...args);

    return NextResponse.json({
      success: true,
      apiId,
      method,
      data: result,
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
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
