const MODERN_COLOR_FUNCTION = /(oklch|oklab|lab|lch|color)\([^)]*\)/gi;

function normalizeModernColors(value: string, context: CanvasRenderingContext2D) {
  return value.replace(MODERN_COLOR_FUNCTION, (color) => {
    context.fillStyle = '#000';
    context.fillStyle = color;
    return context.fillStyle;
  });
}

/** html2canvas currently cannot parse CSS Color 4 functions used by newer Tailwind themes. */
export function makeHtml2CanvasCloneColorSafe(source: HTMLElement, cloneDocument: Document) {
  source.dataset.captureRoot ||= crypto.randomUUID();
  const clone = cloneDocument.querySelector(`[data-capture-root="${source.dataset.captureRoot}"]`);
  if (!(clone instanceof HTMLElement)) return;
  const context = cloneDocument.createElement('canvas').getContext('2d');
  if (!context) return;

  const properties = [
    'color', 'backgroundColor', 'backgroundImage', 'borderTopColor', 'borderRightColor',
    'borderBottomColor', 'borderLeftColor', 'outlineColor', 'textDecorationColor',
    'textEmphasisColor', 'fill', 'stroke', 'boxShadow', 'textShadow',
  ] as const;
  const originals = [source, ...Array.from(source.querySelectorAll<HTMLElement>('*'))];
  const clones = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
  originals.forEach((element, index) => {
    const target = clones[index];
    if (!target) return;
    const computed = window.getComputedStyle(element);
    for (const property of properties) {
      const value = computed[property as keyof CSSStyleDeclaration];
      if (typeof value === 'string' && value) {
        target.style.setProperty(property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), normalizeModernColors(value, context));
      }
    }
  });
}
