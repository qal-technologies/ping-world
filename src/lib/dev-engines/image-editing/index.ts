// jules edit: Image Editing Engine with color filters, blue tone, saturation, highlights, black & white, and background removal pixel algorithms.

export interface RawImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray | number[];
}

export interface ColorFilterConfig {
  hueShift?: number; // -180 to 180
  saturation?: number; // 0 to 300
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  blueTone?: boolean;
  blackAndWhite?: boolean;
  highlight?: number; // -100 to 100
}

export class ImageEditingEngine {
  public removeColor(image: RawImageData, targetHex: string, tolerance = 30): RawImageData {
    try {
      const targetRgb = this.hexToRgb(targetHex);
      const data = new Uint8ClampedArray(image.data);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const diff = Math.sqrt(
          Math.pow(r - targetRgb.r, 2) +
          Math.pow(g - targetRgb.g, 2) +
          Math.pow(b - targetRgb.b, 2)
        );

        if (diff <= tolerance) {
          data[i + 3] = 0; // set alpha to 0 (transparent)
        }
      }

      return { width: image.width, height: image.height, data };
    } catch (e) {
      return image;
    }
  }

  public removeBackground(image: RawImageData, sensitivity = 35): RawImageData {
    try {
      const data = new Uint8ClampedArray(image.data);
      const corners = [
        0,
        (image.width - 1) * 4,
        (image.height - 1) * image.width * 4,
        (image.height * image.width - 1) * 4,
      ];

      let bgR = 0, bgG = 0, bgB = 0;
      corners.forEach(idx => {
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
      });
      bgR /= 4; bgG /= 4; bgB /= 4;

      for (let i = 0; i < data.length; i += 4) {
        const diff = Math.sqrt(
          Math.pow(data[i] - bgR, 2) +
          Math.pow(data[i + 1] - bgG, 2) +
          Math.pow(data[i + 2] - bgB, 2)
        );

        if (diff <= sensitivity) {
          data[i + 3] = 0;
        }
      }

      return { width: image.width, height: image.height, data };
    } catch (e) {
      return image;
    }
  }

  public editSingleColor(image: RawImageData, sourceHex: string, targetHex: string, tolerance = 40): RawImageData {
    try {
      const srcRgb = this.hexToRgb(sourceHex);
      const tgtRgb = this.hexToRgb(targetHex);
      const data = new Uint8ClampedArray(image.data);

      for (let i = 0; i < data.length; i += 4) {
        const diff = Math.sqrt(
          Math.pow(data[i] - srcRgb.r, 2) +
          Math.pow(data[i + 1] - srcRgb.g, 2) +
          Math.pow(data[i + 2] - srcRgb.b, 2)
        );

        if (diff <= tolerance) {
          data[i] = tgtRgb.r;
          data[i + 1] = tgtRgb.g;
          data[i + 2] = tgtRgb.b;
        }
      }

      return { width: image.width, height: image.height, data };
    } catch (e) {
      return image;
    }
  }

  // Expanded with blue tone, highlights, black/white, contrast and light editing parameters
  public applyFilters(image: RawImageData, config: ColorFilterConfig): RawImageData {
    try {
      const data = new Uint8ClampedArray(image.data);
      const hueShift = config.hueShift || 0;
      const brightness = config.brightness || 0;
      const saturationFactor = config.saturation !== undefined ? config.saturation / 100 : 1;
      const highlightFactor = config.highlight || 0;

      // Contrast factor calculation: maps -100..100 to 0.1..3.0
      const contrast = config.contrast || 0;
      const contrastFactor = Math.pow((contrast + 100) / 100, 2);

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        const a = data[i + 3];

        if (a === 0) continue;

        // Brightness
        r += brightness;
        g += brightness;
        b += brightness;

        // Highlights (affects brighter pixels more than dark ones)
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        if (luminance > 128) {
          r += highlightFactor * 0.5;
          g += highlightFactor * 0.5;
          b += highlightFactor * 0.5;
        }

        // Contrast
        r = (r - 128) * contrastFactor + 128;
        g = (g - 128) * contrastFactor + 128;
        b = (b - 128) * contrastFactor + 128;

        // Hue Shift using local HSL
        if (hueShift !== 0) {
          const hsl = this.rgbToHsl(r, g, b);
          hsl.h = (hsl.h + hueShift + 360) % 360;
          const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
          r = rgb.r; g = rgb.g; b = rgb.b;
        }

        // Saturation factor
        if (saturationFactor !== 1) {
          const avg = (r + g + b) / 3;
          r = avg + (r - avg) * saturationFactor;
          g = avg + (g - avg) * saturationFactor;
          b = avg + (b - avg) * saturationFactor;
        }

        // Blue Tone filter effect
        if (config.blueTone) {
          r = r * 0.8;
          g = g * 0.9;
          b = Math.min(255, b * 1.3);
        }

        // Black and White filter effect
        if (config.blackAndWhite) {
          const bw = 0.299 * r + 0.587 * g + 0.114 * b;
          r = bw; g = bw; b = bw;
        }

        data[i] = Math.min(255, Math.max(0, Math.round(r)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
      }

      return { width: image.width, height: image.height, data };
    } catch (e) {
      return image;
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    let clean = hex.trim().replace('#', '');
    if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
    return {
      r: parseInt(clean.substring(0, 2), 16) || 0,
      g: parseInt(clean.substring(2, 4), 16) || 0,
      b: parseInt(clean.substring(4, 6), 16) || 0,
    };
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360; s /= 100; l /= 100;
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }
}
