export interface ColorFormatDetails {
  format: 'HEX' | 'RGB' | 'HSL' | 'UNKNOWN';
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  name: string;
  nearestNamedColor: string;
  luminance: number;
}

export interface ColorMatchResult {
  colorA: string;
  colorB: string;
  matchScore: number;
  similarityPercentage: number;
  contrastRatio: number;
  isAccessibleAA: boolean;
  isAccessibleAAA: boolean;
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
  wheat: '#f5de13',
  yellowgreen: '#9acd32',
};

export class ColorSuggestionEngine {
  public detect(colorStr: string): ColorFormatDetails {
    try {
      const clean = (colorStr || '').trim().toLowerCase();

      // Check if named color directly
      if (CSS_NAMED_COLORS[clean]) {
        const hex = CSS_NAMED_COLORS[clean];
        const rgb = this.hexToRgb(hex);
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
        return {
          format: 'HEX',
          hex,
          rgb,
          hsl,
          name: clean,
          nearestNamedColor: clean,
          luminance: this.getLuminance(rgb.r, rgb.g, rgb.b),
        };
      }

      if (clean.startsWith('#')) {
        const hex =
          clean.length === 4 ?
            `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`
          : clean;
        const rgb = this.hexToRgb(hex);
        const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
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

      if (clean.startsWith('rgb')) {
        const match = clean.match(/\d+/g);
        if (match && match.length >= 3) {
          const [r, g, b] = match.map(Number);
          const hex = this.rgbToHex(r, g, b);
          const hsl = this.rgbToHsl(r, g, b);
          const nearest = this.findNearestNamedColor({ r, g, b });
          return {
            format: 'RGB',
            hex,
            rgb: { r, g, b },
            hsl,
            name: nearest.name,
            nearestNamedColor: nearest.name,
            luminance: this.getLuminance(r, g, b),
          };
        }
      }

      // Default fallback
      return this.detect('#00f0ff');
    } catch (e) {
      return this.detect('#00f0ff');
    }
  }

  public compare(colorA: string, colorB: string): ColorMatchResult {
    const detA = this.detect(colorA);
    const detB = this.detect(colorB);

    const dr = detA.rgb.r - detB.rgb.r;
    const dg = detA.rgb.g - detB.rgb.g;
    const db = detA.rgb.b - detB.rgb.b;
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);

    const maxDist = Math.sqrt(255 * 255 * 3);
    const similarityPercentage = Math.max(
      0,
      Math.min(100, Math.round((1 - distance / maxDist) * 100)),
    );

    const lumA = detA.luminance;
    const lumB = detB.luminance;
    const contrastRatio = Number(
      ((Math.max(lumA, lumB) + 0.05) / (Math.min(lumA, lumB) + 0.05)).toFixed(
        2,
      ),
    );

    return {
      colorA: detA.hex,
      colorB: detB.hex,
      matchScore: Number((1 - distance / maxDist).toFixed(4)),
      similarityPercentage,
      contrastRatio,
      isAccessibleAA: contrastRatio >= 4.5,
      isAccessibleAAA: contrastRatio >= 7.0,
    };
  }

  public suggestShades(colorStr: string, count = 5): string[] {
    const det = this.detect(colorStr);
    const shades: string[] = [];
    const step = 80 / (count + 1);

    for (let i = 1; i <= count; i++) {
      const l = Math.max(10, Math.min(90, Math.round(step * i)));
      const rgb = this.hslToRgb(det.hsl.h, det.hsl.s, l);
      shades.push(this.rgbToHex(rgb.r, rgb.g, rgb.b));
    }
    return shades;
  }

  public findNearestNamedColor(rgb: { r: number; g: number; b: number }): {
    name: string;
    hex: string;
    distance: number;
  } {
    let minDistance = Infinity;
    let closestName = 'cyan';
    let closestHex = '#00ffff';

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
      distance: Math.round(minDistance),
    };
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const num = parseInt(hex.replace('#', ''), 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
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
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
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
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
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
