export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'critical';
export type SoundType = 'beep' | 'chime' | 'alarm' | 'pop' | 'none';

export interface AlertConfig {
  id?: string;
  title: string;
  message: string;
  type?: ToastType;
  durationMs?: number; // 0 for persistent
  sound?: SoundType;
  vibrate?: number[]; // e.g. [100, 50, 100]
  screenFlash?: boolean;
  flashColor?: string;
  ariaLive?: 'polite' | 'assertive';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  customStyles?: Record<string, string>;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export class AlertingToastEngine {
  private activeAlerts: Map<string, AlertConfig> = new Map();

  public trigger(config: AlertConfig): string {
    try {
      const id = config.id || `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fullConfig: AlertConfig = {
        type: 'info',
        durationMs: 4000,
        sound: 'beep',
        ariaLive: config.type === 'critical' || config.type === 'error' ? 'assertive' : 'polite',
        position: 'top-right',
        ...config,
        id,
      };

      this.activeAlerts.set(id, fullConfig);

      if (typeof window !== 'undefined') {
        // Audio accessibility feedback
        if (fullConfig.sound && fullConfig.sound !== 'none') {
          this.playAudioAlert(fullConfig.sound);
        }

        // Haptic feedback for tactile accessibility
        if (fullConfig.vibrate && 'vibrate' in navigator) {
          navigator.vibrate(fullConfig.vibrate);
        } else if (fullConfig.type === 'critical' && 'vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 400]);
        }

        // Screen Flash for hearing-impaired accessibility
        if (fullConfig.screenFlash || fullConfig.type === 'critical') {
          this.triggerScreenFlash(fullConfig.flashColor || (fullConfig.type === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(0,240,255,0.2)'));
        }

        // DOM Rendering fallback
        this.renderToastElement(fullConfig);
      }

      if (fullConfig.durationMs && fullConfig.durationMs > 0) {
        setTimeout(() => {
          this.dismiss(id);
        }, fullConfig.durationMs);
      }

      return id;
    } catch (e) {
      return config.id || 'error_id';
    }
  }

  public dismiss(id: string): void {
    this.activeAlerts.delete(id);
    if (typeof window !== 'undefined') {
      const el = document.getElementById(`ping_toast_${id}`);
      if (el) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(-10px)';
        setTimeout(() => el.remove(), 300);
      }
    }
  }

  public playAudioAlert(type: SoundType = 'beep'): void {
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
        osc.frequency.setValueAtTime(880, now); // A5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'chime') {
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'alarm') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      }
    } catch (e) {
      // Audio autoplay blocked or unsupported
    }
  }

  public triggerScreenFlash(color = 'rgba(0,240,255,0.2)', durationMs = 300): void {
    if (typeof window === 'undefined') return;
    try {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.backgroundColor = color;
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '99999';
      overlay.style.transition = 'opacity 0.3s ease';
      document.body.appendChild(overlay);

      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
      }, durationMs);
    } catch (e) {}
  }

  private renderToastElement(config: AlertConfig): void {
    const containerId = 'ping_toast_container';
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.gap = '10px';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.id = `ping_toast_${config.id}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', config.ariaLive || 'polite');
    toast.style.background = 'rgba(15, 23, 42, 0.95)';
    toast.style.backdropFilter = 'blur(12px)';
    toast.style.border = `1px solid ${this.getTypeColor(config.type)}`;
    toast.style.borderRadius = '12px';
    toast.style.padding = '14px 18px';
    toast.style.color = '#ffffff';
    toast.style.boxShadow = `0 10px 30px -5px ${this.getTypeColor(config.type)}40`;
    toast.style.minWidth = '280px';
    toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

    toast.innerHTML = `
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px; color: ${this.getTypeColor(config.type)}; display: flex; align-items: center; justify-content: space-between;">
        <span>${config.title}</span>
        <button onclick="document.getElementById('ping_toast_${config.id}')?.remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;">✕</button>
      </div>
      <div style="font-size: 13px; color: #cbd5e1;">${config.message}</div>
    `;

    container.appendChild(toast);
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
