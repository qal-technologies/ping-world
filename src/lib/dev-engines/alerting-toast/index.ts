// jules edit: Zero-dependency self-contained class-based alert, toast, confirm, and prompt system with DOM injection, stacking, custom animations, vibration, and audio chimes.

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'critical';
export type SoundType = 'beep' | 'chime' | 'alarm' | 'pop' | 'none';
export type AnimationType = 'fade' | 'blur' | 'flash' | 'slide';

export interface AlertConfig {
  id?: string;
  title: string;
  message: string;
  type?: ToastType;
  durationMs?: number; // 0 for persistent
  sound?: SoundType;
  vibrate?: number[];
  screenFlash?: boolean;
  flashColor?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' | { x: number; y: number };
  fullWidth?: boolean;
  maxWidth?: string; // e.g. "400px"
  customStyles?: Record<string, string>;
  animation?: AnimationType;
  stackingMode?: 'stack' | 'wrap'; // stack sequentially or wrap behind
}

export class AlertingToastEngine {
  private static instance: AlertingToastEngine | null = null;
  private activeToasts: AlertConfig[] = [];
  private activeDialog: { resolve: (val: any) => void; element: HTMLDivElement } | null = null;

  public static getInstance(): AlertingToastEngine {
    if (!this.instance) {
      this.instance = new AlertingToastEngine();
    }
    return this.instance;
  }

  // Trigger non-blocking Toast
  public trigger(config: AlertConfig): string {
    const id = config.id || `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullConfig: AlertConfig = {
      type: 'info',
      durationMs: 4000,
      sound: 'chime',
      position: 'top-right',
      animation: 'slide',
      stackingMode: 'stack',
      ...config,
      id,
    };

    this.activeToasts.push(fullConfig);

    if (typeof window !== 'undefined') {
      // Sound feedback based on alert type
      this.playTypeSound(fullConfig.type, fullConfig.sound);

      // Distracting screen flash for critical alerts
      if (fullConfig.screenFlash || fullConfig.type === 'critical') {
        this.triggerBrightScreenFlash(fullConfig.flashColor);
      }

      // Vibration check
      if ('vibrate' in navigator) {
        navigator.vibrate(fullConfig.vibrate || [100, 50, 100]);
      }

      // Render into root
      this.renderToast(fullConfig);
    }

    if (fullConfig.durationMs && fullConfig.durationMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, fullConfig.durationMs);
    }

    return id;
  }

  // Trigger Modal Confirm (Returns Promise<boolean>)
  public confirm(title: string, message: string, confirmLabel = 'Confirm', cancelLabel = 'Cancel'): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      this.cancelActiveDialog();

      const container = this.getOrCreateRootContainer();
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        animation: ping_fade_in 0.25s ease-out;
      `;

      modal.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid #00f0ff; border-radius: 16px; padding: 24px; max-width: 420px; width: 100%; box-shadow: 0 20px 50px rgba(0,240,255,0.3); color: #ffffff; font-family: sans-serif; text-align: center;">
          <h3 style="font-size: 18px; font-weight: bold; margin: 0 0 10px 0; color: #00f0ff;">${title}</h3>
          <p style="font-size: 14px; color: #cbd5e1; margin: 0 0 20px 0; line-height: 1.5;">${message}</p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="ping_cancel_btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">${cancelLabel}</button>
            <button id="ping_confirm_btn" style="background: #00f0ff; border: none; color: #000000; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(0,240,255,0.4);">${confirmLabel}</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector('#ping_cancel_btn')?.addEventListener('click', () => {
        modal.remove();
        this.activeDialog = null;
        resolve(false);
      });

      modal.querySelector('#ping_confirm_btn')?.addEventListener('click', () => {
        modal.remove();
        this.activeDialog = null;
        resolve(true);
      });

      this.activeDialog = { resolve, element: modal };
    });
  }

  // Trigger Modal Prompt (Returns Promise<string | null>)
  public prompt(title: string, message: string, defaultValue = '', placeholder = 'Type here...'): Promise<string | null> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(null);
        return;
      }
      this.cancelActiveDialog();

      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        animation: ping_fade_in 0.25s ease-out;
      `;

      modal.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.95); border: 2px solid #00f0ff; border-radius: 16px; padding: 24px; max-width: 420px; width: 100%; box-shadow: 0 20px 50px rgba(0,240,255,0.3); color: #ffffff; font-family: sans-serif; text-align: center;">
          <h3 style="font-size: 18px; font-weight: bold; margin: 0 0 10px 0; color: #00f0ff;">${title}</h3>
          <p style="font-size: 14px; color: #cbd5e1; margin: 0 0 15px 0;">${message}</p>
          <input id="ping_prompt_input" type="text" value="${defaultValue}" placeholder="${placeholder}" style="width: 100%; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 10px; color: #ffffff; margin-bottom: 20px; box-sizing: border-box; text-align: center; outline: none; font-family: monospace;" />
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="ping_cancel_btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">Cancel</button>
            <button id="ping_submit_btn" style="background: #00f0ff; border: none; color: #000000; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 12px rgba(0,240,255,0.4);">Submit</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      const inputEl = modal.querySelector('#ping_prompt_input') as HTMLInputElement;
      inputEl.focus();

      modal.querySelector('#ping_cancel_btn')?.addEventListener('click', () => {
        modal.remove();
        this.activeDialog = null;
        resolve(null);
      });

      modal.querySelector('#ping_submit_btn')?.addEventListener('click', () => {
        const val = inputEl.value;
        modal.remove();
        this.activeDialog = null;
        resolve(val);
      });

      this.activeDialog = { resolve, element: modal };
    });
  }

  private cancelActiveDialog(): void {
    if (this.activeDialog) {
      this.activeDialog.element.remove();
      this.activeDialog.resolve(null);
      this.activeDialog = null;
    }
  }

  public dismiss(id: string): void {
    this.activeToasts = this.activeToasts.filter(t => t.id !== id);
    if (typeof window !== 'undefined') {
      const el = document.getElementById(`ping_toast_${id}`);
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'scale(0.8) translateY(-20px)';
        el.style.filter = 'blur(10px)';
        setTimeout(() => el.remove(), 300);
      }
    }
  }

  private playTypeSound(type?: ToastType, overrideSound?: SoundType) {
    if (overrideSound === 'none') return;
    const soundToPlay = overrideSound || (type === 'error' || type === 'critical' ? 'alarm' : 'chime');
    this.playAudioAlert(soundToPlay);
  }

  public playAudioAlert(type: SoundType = 'chime'): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'beep') {
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'chime') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'alarm') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.15);
        osc.frequency.linearRampToValueAtTime(880, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'pop') {
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (e) {}
  }

  public triggerBrightScreenFlash(color = 'rgba(255,0,85,0.45)', durationMs = 450): void {
    if (typeof window === 'undefined') return;
    try {
      const flash = document.createElement('div');
      flash.style.cssText = `
        position: fixed;
        inset: 0;
        background-color: ${color};
        pointer-events: none;
        z-index: 100001;
        transition: opacity ${durationMs}ms cubic-bezier(0.1, 0.8, 0.3, 1);
        opacity: 1;
      `;
      document.body.appendChild(flash);

      // Force layout calculation
      flash.offsetHeight;
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), durationMs + 50);
    } catch (e) {}
  }

  private renderToast(config: AlertConfig): void {
    const container = this.getOrCreateRootContainer();

    // Prepare container alignment based on position config
    const position = config.position || 'top-right';
    this.alignContainerStyle(container, position);

    const toast = document.createElement('div');
    toast.id = `ping_toast_${config.id}`;
    toast.setAttribute('role', 'alert');

    // Support width constraints
    const maxW = config.fullWidth ? '100%' : (config.maxWidth || '360px');
    const borderCol = this.getTypeColor(config.type);

    // Dynamic animations style
    let animCss = 'ping_slide_in';
    if (config.animation === 'fade') animCss = 'ping_fade_in';
    else if (config.animation === 'blur') animCss = 'ping_blur_in';
    else if (config.animation === 'flash') animCss = 'ping_flash_in';

    toast.style.cssText = `
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(14px);
      border: 2px solid ${borderCol};
      border-radius: 12px;
      padding: 14px 18px;
      color: #ffffff;
      box-shadow: 0 12px 36px -4px ${borderCol}50;
      width: ${config.fullWidth ? '100%' : 'auto'};
      max-width: ${maxW};
      animation: ${animCss} 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      margin-bottom: 8px;
      font-family: sans-serif;
    `;

    // Wrapping versus stacking
    if (config.stackingMode === 'wrap' && container.children.length > 0) {
      // Hide earlier children behind active one
      Array.from(container.children).forEach((child: any) => {
        child.style.opacity = '0.4';
        child.style.transform = 'scale(0.92) translateY(-10px)';
        child.style.zIndex = '1';
      });
      toast.style.zIndex = '10';
    }

    toast.innerHTML = `
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: ${borderCol}; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <span>${config.title}</span>
        <button id="close_${config.id}" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:2px;">✕</button>
      </div>
      <div style="font-size: 13px; color: #cbd5e1; line-height: 1.4;">${config.message}</div>
    `;

    container.appendChild(toast);

    toast.querySelector(`#close_${config.id}`)?.addEventListener('click', () => {
      this.dismiss(config.id!);
    });

    // Make wrapped toasts re-activate on click
    if (config.stackingMode === 'wrap') {
      toast.addEventListener('click', () => {
        Array.from(container.children).forEach((child: any) => {
          child.style.opacity = '1';
          child.style.transform = 'none';
        });
      });
    }
  }

  private getOrCreateRootContainer(): HTMLDivElement {
    const id = 'ping_alert_system_root';
    let root = document.getElementById(id) as HTMLDivElement;
    if (!root) {
      root = document.createElement('div');
      root.id = id;
      root.style.cssText = `
        position: fixed;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(root);

      // Inject self-contained keyframe animations
      const styles = document.createElement('style');
      styles.textContent = `
        @keyframes ping_slide_in {
          from { transform: translateY(-20px) scale(0.9); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes ping_fade_in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ping_blur_in {
          from { filter: blur(15px); opacity: 0; }
          to { filter: blur(0); opacity: 1; }
        }
        @keyframes ping_flash_in {
          0% { filter: brightness(3); opacity: 0; }
          50% { filter: brightness(3); opacity: 0.8; }
          100% { filter: brightness(1); opacity: 1; }
        }
        #ping_alert_system_root > * {
          pointer-events: auto;
        }
      `;
      document.head.appendChild(styles);
    }
    return root;
  }

  private alignContainerStyle(container: HTMLDivElement, pos: any) {
    if (typeof pos === 'object') {
      // Direct Absolute X/Y positions
      container.style.top = `${pos.y}px`;
      container.style.left = `${pos.x}px`;
      container.style.right = 'auto';
      container.style.bottom = 'auto';
      return;
    }

    // Traditional presets
    container.style.top = 'auto';
    container.style.bottom = 'auto';
    container.style.left = 'auto';
    container.style.right = 'auto';

    switch (pos) {
      case 'top-left':
        container.style.top = '24px';
        container.style.left = '24px';
        break;
      case 'top-center':
        container.style.top = '24px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        break;
      case 'bottom-left':
        container.style.bottom = '24px';
        container.style.left = '24px';
        break;
      case 'bottom-right':
        container.style.bottom = '24px';
        container.style.right = '24px';
        break;
      case 'bottom-center':
        container.style.bottom = '24px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        break;
      case 'top-right':
      default:
        container.style.top = '24px';
        container.style.right = '24px';
        break;
    }
  }

  private getTypeColor(type?: ToastType): string {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ff0055';
      case 'info':
      default: return '#00f0ff';
    }
  }
}
