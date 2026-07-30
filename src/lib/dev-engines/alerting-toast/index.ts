// ============================================================
// Alerting & Toast Engine — Premium audio-visual alerts
// Tone-matched sounds per alert type
// Screen flash, vibration, stacking, confirm/prompt dialogs
// ============================================================

export type AlertType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'toast'
  | 'confirm'
  | 'prompt';
export type AlertPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | { x: number; y: number }; // Exact coordinate positioning

export type AlertAnimation =
  | 'fade'
  | 'blur'
  | 'flash'
  | 'slide'
  | 'scale'
  | 'bounce';

export interface AlertButton {
  label: string;
  action?: () => void | Promise<void>;
  style?: 'primary' | 'danger' | 'ghost' | 'outline';
  closeOnClick?: boolean;
}

export interface AlertConfig {
  id?: string;
  title?: string;
  message?: string;
  type?: AlertType;
  position?: AlertPosition;
  duration?: number; // ms (0 = persistent)
  sound?:
    | boolean
    | 'chime'
    | 'beep'
    | 'alarm'
    | 'success'
    | 'error'
    | 'warning'
    | 'info'
    | 'none';
  flashScreen?: boolean;
  flashColor?: string; // Default: type-matched
  flashDurationMs?: number;
  vibrate?: boolean | number | number[]; // ms or pattern
  animation?: AlertAnimation;
  animationOut?: AlertAnimation;
  fullWidth?: boolean;
  maxWidth?: string;
  customStyle?: Record<string, string>;
  // Confirm/Prompt
  confirmText?: string;
  cancelText?: string;
  inputPlaceholder?: string;
  inputType?: 'text' | 'password' | 'number' | 'email';
  buttons?: AlertButton[];
  // Stacking mode
  stackMode?: 'stack' | 'wrap'; // stack = show under each other, wrap = hide behind new
  // Callbacks
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
  onDismiss?: () => void;
}

export interface AlertResult {
  id: string;
  type: AlertType;
  dismissed: boolean;
  value?: string; // For prompt dialogs
  confirmed?: boolean;
}

// ---- Tone-matched sound frequencies per alert type ----
const ALERT_SOUNDS: Record<
  string,
  {
    freq: number;
    freq2?: number;
    duration: number;
    waveType: OscillatorType;
    gain: number;
  }[]
> = {
  success: [
    { freq: 523, duration: 0.1, waveType: 'sine', gain: 0.3 }, // C5
    { freq: 659, duration: 0.1, waveType: 'sine', gain: 0.3 }, // E5
    { freq: 784, duration: 0.18, waveType: 'sine', gain: 0.35 }, // G5 — triumphant chord
  ],
  error: [
    { freq: 220, duration: 0.12, waveType: 'sawtooth', gain: 0.4 }, // harsh
    { freq: 180, duration: 0.2, waveType: 'sawtooth', gain: 0.4 }, // growl down
  ],
  warning: [
    { freq: 440, duration: 0.08, waveType: 'square', gain: 0.3 }, // A4
    { freq: 440, duration: 0.08, waveType: 'square', gain: 0.3 }, // double beep
  ],
  info: [
    { freq: 660, duration: 0.12, waveType: 'sine', gain: 0.25 }, // soft high note
    { freq: 550, duration: 0.1, waveType: 'sine', gain: 0.2 }, // soft drop
  ],
  chime: [
    { freq: 880, duration: 0.08, waveType: 'sine', gain: 0.3 },
    { freq: 1046, duration: 0.15, waveType: 'sine', gain: 0.3 },
  ],
  beep: [{ freq: 880, duration: 0.12, waveType: 'square', gain: 0.35 }],
  alarm: [
    { freq: 440, duration: 0.1, waveType: 'square', gain: 0.5 },
    { freq: 330, duration: 0.1, waveType: 'square', gain: 0.5 },
    { freq: 440, duration: 0.1, waveType: 'square', gain: 0.5 },
  ],
};

const ALERT_COLORS: Record<
  string,
  { bg: string; border: string; text: string; flash: string }
> = {
  success: {
    bg: '#0a2e1f',
    border: '#22c55e',
    text: '#86efac',
    flash: 'rgba(34,197,94,0.25)',
  },
  error: {
    bg: '#2e0a0a',
    border: '#ef4444',
    text: '#fca5a5',
    flash: 'rgba(239,68,68,0.25)',
  },
  warning: {
    bg: '#2e1f0a',
    border: '#f59e0b',
    text: '#fcd34d',
    flash: 'rgba(245,158,11,0.25)',
  },
  info: {
    bg: '#0a1a2e',
    border: '#3b82f6',
    text: '#93c5fd',
    flash: 'rgba(59,130,246,0.25)',
  },
  confirm: {
    bg: '#0a0a2e',
    border: '#8b5cf6',
    text: '#c4b5fd',
    flash: 'rgba(139,92,246,0.25)',
  },
  prompt: {
    bg: '#0a0a2e',
    border: '#06b6d4',
    text: '#a5f3fc',
    flash: 'rgba(6,182,212,0.25)',
  },
  toast: {
    bg: '#111111',
    border: '#444444',
    text: '#ffffff',
    flash: 'rgba(255,255,255,0.15)',
  },
};

let _audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    } catch {
      _audioCtx = null;
    }
  }
  return _audioCtx;
}

const activeAlerts = new Map<string, HTMLElement>();
let alertContainer: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement | null {
  if (typeof window === 'undefined') return null;
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    alertContainer.id = '__pw_alert_container__';
    Object.assign(alertContainer.style, {
      position: 'fixed',
      zIndex: '99999',
      inset: '0',
      pointerEvents: 'none',
      fontFamily: 'system-ui, sans-serif',
    });
    document.body.appendChild(alertContainer);
  }
  return alertContainer;
}

export class AlertingToastEngine {
  /** Primary trigger — plays sound, flash, vibration, and renders UI */
  public trigger(config: AlertConfig): AlertResult {
    const id =
      config.id ??
      `pw_alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const type = config.type ?? 'info';
    const result: AlertResult = { id, type, dismissed: false };

    if (typeof window !== 'undefined') {
      this._playSound(config.sound, type);
      if (config.flashScreen)
        this._flashScreen(type, config.flashColor, config.flashDurationMs);
      if (config.vibrate !== false && config.vibrate !== undefined)
        this._vibrate(config.vibrate);
      this._renderAlert(id, config, result);
    }

    return result;
  }

  /** Toast notification (non-blocking, stackable) */
  public toast(
    message: string,
    type: AlertType = 'info',
    options: Partial<AlertConfig> = {},
  ): AlertResult {
    return this.trigger({
      ...options,
      message,
      type: type === 'confirm' || type === 'prompt' ? 'toast' : type,
      duration: options.duration ?? 4000,
    });
  }

  /** Confirm dialog with onConfirm / onCancel callbacks */
  public confirm(
    message: string,
    options: Partial<AlertConfig> = {},
  ): AlertResult {
    return this.trigger({ ...options, message, type: 'confirm', duration: 0 });
  }

  /** Prompt dialog — collects user input and returns via onConfirm(value) */
  public prompt(
    message: string,
    options: Partial<AlertConfig> = {},
  ): AlertResult {
    return this.trigger({ ...options, message, type: 'prompt', duration: 0 });
  }

  /** Manually dismiss an alert by ID */
  public dismiss(id: string): void {
    const el = activeAlerts.get(id);
    if (el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        el.remove();
        activeAlerts.delete(id);
      }, 300);
    }
  }

  /** Dismiss all active alerts */
  public dismissAll(): void {
    activeAlerts.forEach((_, id) => this.dismiss(id));
  }

  /** Flash screen (accessible attention signal) */
  public flashScreen(color?: string, durationMs = 500): void {
    this._flashScreen('info', color, durationMs);
  }

  /** Vibrate device */
  public vibrate(pattern: number | number[] = 200): void {
    this._vibrate(pattern);
  }

  /** Play a sound directly */
  public playSound(type: string = 'info'): void {
    this._playSound(true, type as AlertType);
  }

  // ---- Private methods ----

  private _playSound(sound: AlertConfig['sound'], type: AlertType): void {
    try {
      if (sound === false || sound === 'none') return;
      const ctx = getAudioContext();
      if (!ctx) return;

      // Determine which sound sequence to use
      let key = typeof sound === 'string' && sound !== true ? sound : type;
      const sequence = ALERT_SOUNDS[key] ?? ALERT_SOUNDS['info'];

      let time = ctx.currentTime + 0.01;
      sequence.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = note.waveType;
        osc.frequency.setValueAtTime(note.freq, time);
        gain.gain.setValueAtTime(note.gain, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + note.duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + note.duration);
        time += note.duration + 0.04;
      });
    } catch {
      /* audio may fail on some browsers */
    }
  }

  private _flashScreen(
    type: string,
    customColor?: string,
    durationMs = 500,
  ): void {
    if (typeof window === 'undefined') return;
    try {
      const colors = ALERT_COLORS[type] ?? ALERT_COLORS['info'];
      const flashEl = document.createElement('div');
      const color = customColor ?? colors.flash;
      Object.assign(flashEl.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '999998',
        backgroundColor: color,
        pointerEvents: 'none',
        transition: `opacity ${durationMs / 2}ms ease`,
        opacity: '0.85',
      });
      document.body.appendChild(flashEl);
      requestAnimationFrame(() => {
        setTimeout(() => {
          flashEl.style.opacity = '0';
          setTimeout(() => flashEl.remove(), durationMs / 2);
        }, durationMs / 2);
      });
    } catch {
      /* no-op */
    }
  }

  private _vibrate(pattern: number | number[] | boolean): void {
    if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
    try {
      if (pattern === true) navigator.vibrate(200);
      else if (Array.isArray(pattern)) navigator.vibrate(pattern);
      else if (typeof pattern === 'number') navigator.vibrate(pattern);
    } catch {
      /* no-op */
    }
  }

  private _resolvePosition(
    position: AlertPosition = 'top-right',
  ): Partial<CSSStyleDeclaration> {
    if (typeof position === 'object' && 'x' in position) {
      return {
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
      };
    }
    const positions: Record<string, Partial<CSSStyleDeclaration>> = {
      'top-left': { top: '20px', left: '20px' },
      'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
      'top-right': { top: '20px', right: '20px' },
      center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'bottom-center': {
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
      },
      'bottom-right': { bottom: '20px', right: '20px' },
    };
    return positions[position as string] ?? positions['top-right'];
  }

  private _renderAlert(
    id: string,
    config: AlertConfig,
    result: AlertResult,
  ): void {
    const container = getContainer();
    if (!container) return;

    const colors = ALERT_COLORS[config.type ?? 'info'] ?? ALERT_COLORS['info'];
    const positionStyle = this._resolvePosition(config.position);
    const isModal = config.type === 'confirm' || config.type === 'prompt';
    const duration = config.duration ?? (isModal ? 0 : 4000);

    const el = document.createElement('div');
    el.id = id;

    Object.assign(el.style, {
      position: 'fixed',
      ...positionStyle,
      background: colors.bg,
      border: `1.5px solid ${colors.border}`,
      color: colors.text,
      borderRadius: '12px',
      padding: '18px 20px',
      maxWidth: config.maxWidth ?? (config.fullWidth ? '100%' : '400px'),
      width: config.fullWidth ? 'calc(100% - 40px)' : 'auto',
      minWidth: '260px',
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${colors.border}22`,
      zIndex: '99999',
      pointerEvents: 'all',
      opacity: '0',
      transform: 'translateY(-8px)',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
      backdropFilter: 'blur(20px)',
      ...(config.customStyle ?? {}),
    });

    // Backdrop for modal dialogs
    let backdropEl: HTMLDivElement | null = null;
    if (isModal) {
      backdropEl = document.createElement('div');
      Object.assign(backdropEl.style, {
        position: 'fixed',
        inset: '0',
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: '99998',
        pointerEvents: 'all',
      });
      container.appendChild(backdropEl);
    }

    // Build inner HTML
    const titleHtml =
      config.title ?
        `<div style="font-weight:700;font-size:15px;margin-bottom:6px;color:#ffffff;">${config.title}</div>`
      : '';
    const msgHtml = `<div style="font-size:13.5px;line-height:1.6;opacity:0.9;">${config.message ?? ''}</div>`;
    const inputHtml =
      config.type === 'prompt' ?
        `<input id="${id}_input" type="${config.inputType ?? 'text'}" placeholder="${config.inputPlaceholder ?? 'Enter your response...'}" style="width:100%;box-sizing:border-box;margin-top:12px;padding:10px 12px;border-radius:8px;border:1px solid ${colors.border};background:rgba(255,255,255,0.07);color:#fff;font-size:13px;outline:none;" />`
      : '';

    // Buttons
    const btnConfirmText = config.confirmText ?? 'Confirm';
    const btnCancelText = config.cancelText ?? 'Cancel';

    const closeFn = (confirmed: boolean, value?: string) => {
      result.dismissed = true;
      result.confirmed = confirmed;
      if (value !== undefined) result.value = value;
      if (confirmed && config.onConfirm) config.onConfirm(value);
      if (!confirmed && config.onCancel) config.onCancel();
      if (config.onDismiss) config.onDismiss();
      backdropEl?.remove();
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => {
        el.remove();
        activeAlerts.delete(id);
      }, 300);
    };

    const buttonsHtml = (() => {
      if (config.type === 'confirm' || config.type === 'prompt') {
        return `<div style="display:flex;gap:10px;margin-top:16px;">
          <button id="${id}_confirm" style="flex:1;padding:10px;border-radius:8px;border:none;background:${colors.border};color:#000;font-weight:700;font-size:13px;cursor:pointer;">${btnConfirmText}</button>
          <button id="${id}_cancel" style="flex:1;padding:10px;border-radius:8px;border:1px solid ${colors.border};background:transparent;color:${colors.text};font-weight:600;font-size:13px;cursor:pointer;">${btnCancelText}</button>
        </div>`;
      }
      if (config.buttons && config.buttons.length > 0) {
        return (
          `<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">` +
          config.buttons
            .map((btn, i) => {
              const bg =
                btn.style === 'primary' ? colors.border
                : btn.style === 'danger' ? '#ef4444'
                : 'transparent';
              const col =
                btn.style === 'primary' || btn.style === 'danger' ?
                  '#000'
                : colors.text;
              return `<button id="${id}_btn_${i}" style="padding:9px 18px;border-radius:8px;border:1px solid ${colors.border};background:${bg};color:${col};font-weight:600;font-size:13px;cursor:pointer;">${btn.label}</button>`;
            })
            .join('') +
          `</div>`
        );
      }
      return '';
    })();

    el.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <div style="flex:1;">
          ${titleHtml}${msgHtml}${inputHtml}${buttonsHtml}
        </div>
        ${!isModal ? `<button id="${id}_x" style="background:none;border:none;color:${colors.text};cursor:pointer;opacity:0.6;font-size:18px;line-height:1;padding:0;margin-top:-2px;">✕</button>` : ''}
      </div>
    `;

    container.appendChild(el);
    activeAlerts.set(id, el);

    // Animate in
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = positionStyle.transform ?? 'translateY(0)';
    });

    // Attach button handlers
    setTimeout(() => {
      el.querySelector(`#${id}_x`)?.addEventListener('click', () =>
        closeFn(false),
      );
      el.querySelector(`#${id}_confirm`)?.addEventListener('click', () => {
        const inputEl = el.querySelector<HTMLInputElement>(`#${id}_input`);
        closeFn(true, inputEl?.value);
      });
      el.querySelector(`#${id}_cancel`)?.addEventListener('click', () =>
        closeFn(false),
      );
      (config.buttons ?? []).forEach((btn, i) => {
        el.querySelector(`#${id}_btn_${i}`)?.addEventListener(
          'click',
          async () => {
            if (btn.action) await btn.action();
            if (btn.closeOnClick !== false) closeFn(true);
          },
        );
      });
    }, 50);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        if (activeAlerts.has(id)) closeFn(false);
      }, duration);
    }
  }
}
