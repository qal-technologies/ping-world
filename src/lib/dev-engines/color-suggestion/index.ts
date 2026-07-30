// ============================================================
// Color Suggestion Engine — 140+ CSS named colors mapping
// RGB/HEX/HSL conversions, % match + WCAG AA/AAA contrast
// Shade generation, alpha blending, saturate/hue adjustments
// ============================================================

export interface ColorFormatDetails {
  format: 'HEX' | 'RGB' | 'HSL' | 'NAME' | 'UNKNOWN';
  hex: string;
  rgb: { r: number; g: number; b: number; a?: number };
  hsl: { h: number; s: number; l: number; a?: number };
  name: string;
  nearestNamedColor: string;
  luminance: number;
}

export interface ColorMatchResult {
  colorA: string;
  colorB: string;
  distance: number;
  matchScore: number;
  similarityPercentage: number;
  contrastRatio: number;
  isAccessibleAA_Normal: boolean;
  isAccessibleAA_Large: boolean;
  isAccessibleAAA_Normal: boolean;
  isAccessibleAAA_Large: boolean;
}

const CSS_NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  lime: '#00ff00',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  silver: '#c0c0c0',
  gray: '#808080',
  maroon: '#800000',
  olive: '#808000',
  green: '#008000',
  purple: '#800080',
  teal: '#008080',
  navy: '#000080',
  orange: '#ffa500',
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  blanchedalmond: '#ffebcd',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgreen: '#006400',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  greenyellow: '#adff2f',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgreen: '#90ee90',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  oldlace: '#fdf5e6',
  olivedrab: '#6b8e23',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  rosypink: '#ff66cc',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  yellowgreen: '#9acd32',
};

export class ColorSuggestionEngine {
  /** Detect color format and return exhaustive details */
  public detect(colorStr: string): ColorFormatDetails {
    try {
      const clean = (colorStr || '').trim().toLowerCase();

      // Is it a named color?
      if (CSS_NAMED_COLORS[clean]) {
        const hex = CSS_NAMED_COLORS[clean];
        const rgb = this.hexToRgb(hex);
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        return {
          format: 'NAME',
          hex,
          rgb,
          hsl,
          name: clean,
          nearestNamedColor: clean,
          luminance: this.getLuminance(rgb.r, rgb.g, rgb.b),
        };
      }

      // Is it HEX?
      if (clean.startsWith('#')) {
        let hex = clean;
        let a: number | undefined = undefined;
        if (clean.length === 4)
          hex = `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
        else if (clean.length === 5) {
          hex = `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
          a = parseInt(`${clean[4]}${clean[4]}`, 16) / 255;
        } else if (clean.length === 9) {
          hex = clean.slice(0, 7);
          a = parseInt(clean.slice(7, 9), 16) / 255;
        }

        const rgb = this.hexToRgb(hex);
        if (a !== undefined) rgb.a = Number(a.toFixed(2));
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        if (a !== undefined) hsl.a = rgb.a;

        const nearest = this.findNearestNamedColor(rgb);
        return {
          format: 'HEX',
          hex,
          rgb,
          hsl,
          name: nearest.name,
          nearestNamedColor: nearest.name,
          luminance: this.getLuminance(rgb.r, rgb.g, rgb.b),
        };
      }

      // Is it RGB / RGBA?
      if (clean.startsWith('rgb')) {
        const m = clean.match(/[\d.]+/g);
        if (m && m.length >= 3) {
          const r = Math.min(255, Math.max(0, parseInt(m[0])));
          const g = Math.min(255, Math.max(0, parseInt(m[1])));
          const b = Math.min(255, Math.max(0, parseInt(m[2])));
          const a =
            m[3] !== undefined ?
              Math.min(1, Math.max(0, parseFloat(m[3])))
            : undefined;

          const hex = this.rgbToHex(r, g, b);
          const hsl = this.rgbToHsl(r, g, b);
          if (a !== undefined) hsl.a = a;

          const nearest = this.findNearestNamedColor({ r, g, b });
          return {
            format: 'RGB',
            hex,
            rgb: { r, g, b, a },
            hsl,
            name: nearest.name,
            nearestNamedColor: nearest.name,
            luminance: this.getLuminance(r, g, b),
          };
        }
      }

      // Is it HSL / HSLA?
      if (clean.startsWith('hsl')) {
        const m = clean.match(/[\d.]+/g);
        if (m && m.length >= 3) {
          const h = parseFloat(m[0]) % 360;
          const s = Math.min(100, Math.max(0, parseFloat(m[1])));
          const l = Math.min(100, Math.max(0, parseFloat(m[2])));
          const a =
            m[3] !== undefined ?
              Math.min(1, Math.max(0, parseFloat(m[3])))
            : undefined;

          const rgb = this.hslToRgb(h, s, l);
          if (a !== undefined) rgb.a = a;
          const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
          const nearest = this.findNearestNamedColor(rgb);

          return {
            format: 'HSL',
            hex,
            rgb,
            hsl: { h, s, l, a },
            name: nearest.name,
            nearestNamedColor: nearest.name,
            luminance: this.getLuminance(rgb.r, rgb.g, rgb.b),
          };
        }
      }

      return this.detect('#000000');
    } catch {
      return this.detect('#000000');
    }
  }

  /** Compare two colors for similarity and WCAG contrast */
  public compare(colorA: string, colorB: string): ColorMatchResult {
    const dA = this.detect(colorA);
    const dB = this.detect(colorB);

    // Euclidean distance in RGB space
    const dr = dA.rgb.r - dB.rgb.r;
    const dg = dA.rgb.g - dB.rgb.g;
    const db = dA.rgb.b - dB.rgb.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    const maxDist = Math.sqrt(255 * 255 * 3);
    const matchScore = Number((1 - distance / maxDist).toFixed(4));
    const similarityPercentage = Math.max(
      0,
      Math.min(100, Math.round(matchScore * 100)),
    );

    // Contrast ratio (L1 + 0.05) / (L2 + 0.05)
    const lumA = dA.luminance;
    const lumB = dB.luminance;
    const contrastRatio = Number(
      ((Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05)).toFixed(
        2,
      ),
    );

    return {
      colorA: dA.hex,
      colorB: dB.hex,
      distance: Number(distance.toFixed(1)),
      matchScore,
      similarityPercentage,
      contrastRatio,
      isAccessibleAA_Normal: contrastRatio >= 4.5,
      isAccessibleAA_Large: contrastRatio >= 3.0,
      isAccessibleAAA_Normal: contrastRatio >= 7.0,
      isAccessibleAAA_Large: contrastRatio >= 4.5,
    };
  }

  /** Generate monochromatic shades / tints */
  public suggestShades(colorStr: string, count = 5): string[] {
    const { hsl } = this.detect(colorStr);
    const shades: string[] = [];
    const step = 80 / (count + 1);
    for (let i = 1; i <= count; i++) {
      const l = Math.max(10, Math.min(90, Math.round(step * i)));
      const rgb = this.hslToRgb(hsl.h, hsl.s, l);
      shades.push(this.rgbToHex(rgb.r, rgb.g, rgb.b));
    }
    return shades;
  }

  /** Get harmony colors (complementary, analogous, triadic, etc.) */
  public getHarmonies(colorStr: string): {
    complementary: string;
    analogous: [string, string];
    triadic: [string, string];
  } {
    const { h, s, l } = this.detect(colorStr).hsl;
    const rH = (h2: number) =>
      this.rgbToHex(
        this.hslToRgb((h2 + 360) % 360, s, l).r,
        this.hslToRgb((h2 + 360) % 360, s, l).g,
        this.hslToRgb((h2 + 360) % 360, s, l).b,
      );
    return {
      complementary: rH(h + 180),
      analogous: [rH(h - 30), rH(h + 30)],
      triadic: [rH(h + 120), rH(h + 240)],
    };
  }

  /** Convert between formats */
  public convert(
    colorStr: string,
    targetFormat: 'HEX' | 'RGB' | 'HSL',
  ): string {
    const d = this.detect(colorStr);
    if (targetFormat === 'HEX')
      return (
        d.hex +
        (d.rgb.a !== undefined ?
          Math.round(d.rgb.a * 255)
            .toString(16)
            .padStart(2, '0')
        : '')
      );
    if (targetFormat === 'RGB')
      return d.rgb.a !== undefined ?
          `rgba(${d.rgb.r}, ${d.rgb.g}, ${d.rgb.b}, ${d.rgb.a})`
        : `rgb(${d.rgb.r}, ${d.rgb.g}, ${d.rgb.b})`;
    if (targetFormat === 'HSL')
      return d.hsl.a !== undefined ?
          `hsla(${d.hsl.h}, ${d.hsl.s}%, ${d.hsl.l}%, ${d.hsl.a})`
        : `hsl(${d.hsl.h}, ${d.hsl.s}%, ${d.hsl.l}%)`;
    return d.hex;
  }

  /** Set opacity */
  public alpha(colorStr: string, alphaValue: number): string {
    const d = this.detect(colorStr);
    const a = Math.max(0, Math.min(1, alphaValue));
    return `rgba(${d.rgb.r}, ${d.rgb.g}, ${d.rgb.b}, ${a})`;
  }

  /** Adjust saturation */
  public saturate(colorStr: string, amount: number): string {
    const d = this.detect(colorStr);
    const s = Math.max(0, Math.min(100, Math.round(d.hsl.s + amount)));
    const rgb = this.hslToRgb(d.hsl.h, s, d.hsl.l);
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  /** Adjust lightness */
  public lighten(colorStr: string, amount: number): string {
    const d = this.detect(colorStr);
    const l = Math.max(0, Math.min(100, Math.round(d.hsl.l + amount)));
    const rgb = this.hslToRgb(d.hsl.h, d.hsl.s, l);
    return this.rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  /** Find the nearest CSS named color to a given RGB */
  public findNearestNamedColor(rgb: { r: number; g: number; b: number }): {
    name: string;
    hex: string;
    distance: number;
  } {
    let minDistance = Infinity;
    let closestName = 'black';
    let closestHex = '#000000';

    for (const [name, hex] of Object.entries(CSS_NAMED_COLORS)) {
      const targetRgb = this.hexToRgb(hex);
      const dr = rgb.r - targetRgb.r;
      const dg = rgb.g - targetRgb.g;
      const db = rgb.b - targetRgb.b;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist < minDistance) {
        minDistance = dist;
        closestName = name;
        closestHex = hex;
      }
    }
    return {
      name: closestName,
      hex: closestHex,
      distance: Number(minDistance.toFixed(2)),
    };
  }

  // ---- Private Helpers ----

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const num = parseInt(hex.replace('#', ''), 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) =>
          Math.max(0, Math.min(255, Math.round(x)))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    );
  }

  private rgbToHsl(
    r: number,
    g: number,
    b: number,
  ): { h: number; s: number; l: number } {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  private hslToRgb(
    h: number,
    s: number,
    l: number,
  ): { r: number; g: number; b: number } {
    h /= 360;
    s /= 100;
    l /= 100;
    if (s === 0) {
      const v = Math.round(l * 255);
      return { r: v, g: v, b: v };
    }
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    };
  }

  private getLuminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }
}
