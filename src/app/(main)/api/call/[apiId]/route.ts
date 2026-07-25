import { NextRequest, NextResponse } from 'next/server';
import { DevEngineRegistry } from '@/lib/dev-engines';

export const runtime = 'edge';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ apiId: string }> }
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
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const method = body.method || body.action || 'analyze';

    // Handle styling script tag request
    if (apiId === 'styling-engine' && method === 'script') {
      const css = engine.generateCSS(body.config || {});
      const scriptContent = `(function(){
        const style = document.createElement('style');
        style.id = 'pingworld_injected_styles';
        style.textContent = ${JSON.stringify(css)};
        document.head.appendChild(style);
      })();`;
      return new Response(scriptContent, {
        headers: { 'content-type': 'application/javascript', 'cache-control': 'public, max-age=3600' },
      });
    }

    if (typeof engine[method] !== 'function') {
      // Find default fallback method if primary method not found
      const availableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(engine)).filter(
        m => m !== 'constructor' && !m.startsWith('_')
      );

      return NextResponse.json(
        {
          success: false,
          error: `Method '${method}' does not exist on API '${apiId}'. Available methods: ${availableMethods.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Pass args array or named params dynamically
    const args = Array.isArray(body.args) 
      ? body.args 
      : body.data !== undefined 
        ? [body.data, body.params || body.options || body.config || body.targetTone || body.key || body.type].filter(x => x !== undefined)
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
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ apiId: string }> }
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
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const method = searchParams.get('method') || searchParams.get('action') || 'getAllCountries';

    if (apiId === 'styling-engine' && method === 'script') {
      const css = engine.generateCSS({});
      const scriptContent = `(function(){
        const style = document.createElement('style');
        style.id = 'pingworld_injected_styles';
        style.textContent = ${JSON.stringify(css)};
        document.head.appendChild(style);
      })();`;
      return new Response(scriptContent, {
        headers: { 'content-type': 'application/javascript', 'cache-control': 'public, max-age=86400' },
      });
    }

    if (typeof engine[method] !== 'function') {
      const availableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(engine)).filter(
        m => m !== 'constructor' && !m.startsWith('_')
      );

      return NextResponse.json(
        {
          success: false,
          error: `Method '${method}' does not exist on API '${apiId}'. Available methods: ${availableMethods.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Extract search param values as method inputs
    const paramInput = searchParams.get('data') || searchParams.get('text') || searchParams.get('query') || searchParams.get('code') || searchParams.get('color');
    const secondaryInput = searchParams.get('param') || searchParams.get('tone') || searchParams.get('targetTone');

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
      { status: 500 }
    );
  }
}
