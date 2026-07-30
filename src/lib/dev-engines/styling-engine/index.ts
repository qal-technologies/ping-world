// ============================================================
// Component Styling Engine — Dynamic UI Themes
// Liquid glass CSS generator and advanced script injection
// Supports custom typography, themes, and dynamic toggles
// ============================================================

export interface StylingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  theme?: 'dark' | 'light' | 'cyber' | 'glass';
  enableGlassmorphism?: boolean;
  enableLiquidGlass?: boolean;
  enableAnimations?: boolean;
  baseFont?: string;
}

export class StylingEngine {
  /** Generates full stylesheet string based on configuration */
  public generateCSS(config: StylingConfig = {}): string {
    const p = config.primaryColor || '#00f0ff';
    const s = config.secondaryColor || '#7000ff';
    const t = config.theme || 'dark';
    const f = config.baseFont || 'system-ui, -apple-system, sans-serif';
    const anims = config.enableAnimations !== false;

    // Theme Variables
    let bg = '#0b0f19',
      text = '#f8fafc',
      muted = '#94a3b8',
      border = 'rgba(255, 255, 255, 0.1)',
      glass = 'rgba(15, 23, 42, 0.65)';
    if (t === 'light') {
      bg = '#ffffff';
      text = '#0f172a';
      muted = '#64748b';
      border = 'rgba(0, 0, 0, 0.08)';
      glass = 'rgba(255, 255, 255, 0.75)';
    } else if (t === 'cyber') {
      bg = '#050014';
      text = '#e0ffff';
      muted = '#507eb3';
      border = `rgba(0, 240, 255, 0.2)`;
      glass = 'rgba(5, 0, 20, 0.85)';
    }

    const cssVars = `
      :root {
        --pw-primary: ${p};
        --pw-secondary: ${s};
        --pw-bg: ${bg};
        --pw-text: ${text};
        --pw-muted: ${muted};
        --pw-border: ${border};
        --pw-glass: ${glass};
        --pw-font: ${f};
      }
    `;

    const base = `
      .pw-root { font-family: var(--pw-font); color: var(--pw-text); }
      .pw-title-gradient { background: linear-gradient(135deg, var(--pw-primary), var(--pw-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800; }
      .pw-text-glow { text-shadow: 0 0 12px var(--pw-primary); }
    `;

    const buttons = `
      .pw-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.625rem 1.25rem; font-size: 0.875rem; font-weight: 600; font-family: var(--pw-font); border-radius: 0.5rem; transition: ${anims ? 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'}; cursor: pointer; border: 1px solid transparent; outline: none; user-select: none; text-decoration: none; }
      .pw-btn-primary { background: linear-gradient(135deg, var(--pw-primary) 0%, var(--pw-secondary) 100%); color: ${t === 'light' ? '#ffffff' : '#000000'}; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15); }
      ${anims ? `.pw-btn-primary:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25); }` : ''}
      .pw-btn-secondary { background: transparent; color: var(--pw-text); border: 1px solid var(--pw-border); }
      ${anims ? `.pw-btn-secondary:hover { background: rgba(150, 150, 150, 0.1); border-color: var(--pw-primary); }` : ''}
    `;

    let liquidGlass = '';
    if (config.enableLiquidGlass || config.enableGlassmorphism) {
      liquidGlass = `
        .pw-card-glass { background: var(--pw-glass); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--pw-border); border-radius: 1rem; padding: 1.5rem; box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2); }
        .pw-btn-liquid { background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%); border: 1px solid rgba(255,255,255,0.2); color: var(--pw-text); box-shadow: inset 0 1px 0 rgba(255,255,255,0.2); }
        ${anims ? `.pw-btn-liquid:hover { background: linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1)); }` : ''}
        .pw-card-liquid { background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.15); border-radius: 1.25rem; padding: 2rem; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
      `;
    }

    const layout = `
      .pw-container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
      .pw-flex-center { display: flex; align-items: center; justify-content: center; }
      .pw-grid-responsive { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
      .pw-stack { display: flex; flex-direction: column; gap: 1rem; }
      .pw-row { display: flex; flex-direction: row; gap: 1rem; align-items: center; }
    `;

    return `/* PingWorld UI Engine v2 */\n${cssVars}\n${base}\n${buttons}\n${liquidGlass}\n${layout}`;
  }

  /** Injects CSS directly into the DOM (browser environments) */
  public injectToDOM(config: StylingConfig = {}): HTMLStyleElement | void {
    if (typeof document === 'undefined') return;
    try {
      const styleId = 'pingworld_styling_engine';
      let styleEl = document.getElementById(styleId) as HTMLStyleElement;
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = styleId;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = this.generateCSS(config);
      return styleEl;
    } catch {}
  }

  /** Generates script tag for dynamic remote injection via API */
  public getScriptTag(baseUrl = 'https://pingworld.app', config?: StylingConfig): string {
    let q = 'method=script';
    if (config) {
      if (config.primaryColor) q += `&primary=${encodeURIComponent(config.primaryColor)}`;
      if (config.secondaryColor) q += `&secondary=${encodeURIComponent(config.secondaryColor)}`;
      if (config.theme) q += `&theme=${config.theme}`;
      if (config.enableLiquidGlass) q += `&liquid=true`;
    }
    return `<script src="${baseUrl}/api/call/styling-engine?${q}" defer></script>`;
  }

  /** Removes injected styles */
  public removeFromDOM(): void {
    if (typeof document === 'undefined') return;
    const styleEl = document.getElementById('pingworld_styling_engine');
    if (styleEl) styleEl.remove();
  }
}
