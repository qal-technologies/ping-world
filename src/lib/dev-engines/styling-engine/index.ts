export interface StylingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  theme?: 'dark' | 'light' | 'cyber' | 'glass';
  enableGlassmorphism?: boolean;
  enableLiquidGlass?: boolean;
  enableAnimations?: boolean;
}

export class StylingEngine {
  public generateCSS(config: StylingConfig = {}): string {
    const primary = config.primaryColor || '#00f0ff';
    const secondary = config.secondaryColor || '#7000ff';
    const darkBg = '#0b0f19';

    return `
      /* --- PingWorld Auto Developer Styling System --- */
      :root {
        --pw-primary: ${primary};
        --pw-secondary: ${secondary};
        --pw-bg: ${darkBg};
        --pw-text: #f8fafc;
        --pw-muted: #94a3b8;
        --pw-border: rgba(255, 255, 255, 0.1);
        --pw-glass: rgba(15, 23, 42, 0.65);
      }

      /* Buttons */
      .pw-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.625rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        border-radius: 0.5rem;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
        border: 1px solid transparent;
        outline: none;
        user-select: none;
      }
      .pw-btn-primary {
        background: linear-gradient(135deg, var(--pw-primary) 0%, var(--pw-secondary) 100%);
        color: #000000;
        box-shadow: 0 4px 14px rgba(0, 240, 255, 0.35);
      }
      .pw-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 240, 255, 0.5);
      }
      .pw-btn-secondary {
        background: rgba(255, 255, 255, 0.05);
        color: var(--pw-text);
        border: 1px solid var(--pw-border);
      }
      .pw-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: var(--pw-primary);
      }
      .pw-btn-liquid {
        background: linear-gradient(135deg, rgba(0,240,255,0.2), rgba(112,0,255,0.2));
        backdrop-filter: blur(16px) saturate(180%);
        -webkit-backdrop-filter: blur(16px) saturate(180%);
        border: 1px solid rgba(0,240,255,0.3);
        color: #ffffff;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
      }

      /* Spacing Utilities - Margins & Paddings */
      .pw-m-1 { margin: 0.25rem !important; }
      .pw-m-2 { margin: 0.5rem !important; }
      .pw-m-3 { margin: 0.75rem !important; }
      .pw-m-4 { margin: 1rem !important; }
      .pw-m-6 { margin: 1.5rem !important; }
      .pw-m-8 { margin: 2rem !important; }

      .pw-mt-2 { margin-top: 0.5rem !important; }
      .pw-mt-4 { margin-top: 1rem !important; }
      .pw-mb-2 { margin-bottom: 0.5rem !important; }
      .pw-mb-4 { margin-bottom: 1rem !important; }
      .pw-mx-auto { margin-left: auto !important; margin-right: auto !important; }

      .pw-p-1 { padding: 0.25rem !important; }
      .pw-p-2 { padding: 0.5rem !important; }
      .pw-p-3 { padding: 0.75rem !important; }
      .pw-p-4 { padding: 1rem !important; }
      .pw-p-6 { padding: 1.5rem !important; }
      .pw-p-8 { padding: 2rem !important; }

      .pw-px-4 { padding-left: 1rem !important; padding-right: 1rem !important; }
      .pw-py-2 { padding-top: 0.5rem !important; padding-bottom: 0.5rem !important; }

      /* Cards & Glassmorphism */
      .pw-card-glass {
        background: var(--pw-glass);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--pw-border);
        border-radius: 1rem;
        padding: 1.5rem;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
      }
      .pw-card-liquid {
        background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 1.25rem;
        padding: 2rem;
        box-shadow: 0 10px 40px rgba(0,240,255,0.1);
      }

      /* Layout & Flex Utilities */
      .pw-container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
      .pw-flex-center { display: flex; align-items: center; justify-content: center; }
      .pw-grid-responsive { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }

      /* Typography */
      .pw-title-gradient {
        background: linear-gradient(135deg, var(--pw-primary), var(--pw-secondary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 800;
      }
      .pw-text-glow { text-shadow: 0 0 12px var(--pw-primary); }
    `;
  }

  public injectGlobalStyles(
    config: StylingConfig = {},
  ): HTMLStyleElement | void {
    if (typeof window === 'undefined') return;
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
    } catch (e) {}
  }

  public injectToDOM(config: StylingConfig = {}): HTMLStyleElement | void {
    return this.injectGlobalStyles(config);
  }

  public getScriptTag(baseUrl = 'https://pingworld.app'): string {
    return `<script src="${baseUrl}/api/call/styling-engine?method=script" defer></script>`;
  }
}
