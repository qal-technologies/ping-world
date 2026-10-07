/** Custom Haptics & Vibration Engine for interactive feedback across Ping World */
export const triggerHaptic = (type: 'next' | 'section' | 'warning' | 'completion') => {
  if (typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    switch (type) {
      case 'next':
        navigator.vibrate([30]);
        break;
      case 'section':
        navigator.vibrate([50, 30, 50]);
        break;
      case 'warning':
        navigator.vibrate([100, 50, 100, 50, 200]);
        break;
      case 'completion':
        navigator.vibrate([100, 50, 100, 50, 300, 100, 500]);
        break;
    }
  } catch {}
};
