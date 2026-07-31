// ============================================================
// Image Editing Engine — Full pixel-level manipulation
// Canvas-based: filters, BW, sepia, blur, sharpen, highlight,
// blue tone, saturation, contrast, color removal, bg removal,
// hue shift, color swap, vignette, noise, and pixel stats
// ============================================================

export interface RawImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray | number[];
}

export interface ImageProcessResult {
  image: RawImageData;
  appliedOps: string[];
}

export interface ColorFilterConfig {
  hueShift?: number; // -180 to 180
  saturation?: number; // -100 to 100 (0 = no change)
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  highlights?: number; // -100 to 100 (boost highlights)
  shadows?: number; // -100 to 100 (lift shadows)
  temperature?: number; // -100 (cool/blue) to 100 (warm/orange)
  tint?: number; // -100 (green) to 100 (pink)
  exposure?: number; // stops: -2.0 to +2.0
  sharpness?: number; // 0 to 100
  vignette?: number; // 0 to 100
  noise?: number; // 0 to 100
  blur?: number; // 0 to 20
}

export interface ImageStats {
  width: number;
  height: number;
  totalPixels: number;
  avgR: number;
  avgG: number;
  avgB: number;
  avgBrightness: number;
  dominantColors: Array<{ hex: string; count: number; percentage: number }>;
  hasTransparency: boolean;
}

export class ImageEditingEngine {
  // ---- Color removal & background ----

  /** Remove a specific color from image (sets to transparent) */
  public removeColor(
    image: RawImageData,
    targetHex: string,
    tolerance = 30,
  ): RawImageData {
    try {
      const tgt = this._hexToRgb(targetHex);
      const data = new Uint8ClampedArray(image.data);
      for (let i = 0; i < data.length; i += 4) {
        if (
          this._colorDist(
            data[i],
            data[i + 1],
            data[i + 2],
            tgt.r,
            tgt.g,
            tgt.b,
          ) <= tolerance
        ) {
          data[i + 3] = 0;
        }
      }
      return { width: image.width, height: image.height, data };
    } catch {
      return image;
    }
  }

  /** Remove background using corner-pixel sampling as background reference */
  public removeBackground(image: RawImageData, sensitivity = 35): RawImageData {
    try {
      const data = new Uint8ClampedArray(image.data);
      const corners = [
        0,
        (image.width - 1) * 4,
        (image.height - 1) * image.width * 4,
        (image.height * image.width - 1) * 4,
      ];
      let bgR = 0,
        bgG = 0,
        bgB = 0;
      corners.forEach((i) => {
        bgR += data[i];
        bgG += data[i + 1];
        bgB += data[i + 2];
      });
      bgR /= 4;
      bgG /= 4;
      bgB /= 4;
      for (let i = 0; i < data.length; i += 4) {
        if (
          this._colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <=
          sensitivity
        )
          data[i + 3] = 0;
      }
      return { width: image.width, height: image.height, data };
    } catch {
      return image;
    }
  }

  /** Replace a specific color with another */
  public swapColor(
    image: RawImageData,
    sourceHex: string,
    targetHex: string,
    tolerance = 40,
  ): RawImageData {
    try {
      const src = this._hexToRgb(sourceHex);
      const tgt = this._hexToRgb(targetHex);
      const data = new Uint8ClampedArray(image.data);
      for (let i = 0; i < data.length; i += 4) {
        if (
          this._colorDist(
            data[i],
            data[i + 1],
            data[i + 2],
            src.r,
            src.g,
            src.b,
          ) <= tolerance
        ) {
          data[i] = tgt.r;
          data[i + 1] = tgt.g;
          data[i + 2] = tgt.b;
        }
      }
      return { width: image.width, height: image.height, data };
    } catch {
      return image;
    }
  }

  /** Alias for swapColor (single color edit) */
  public editSingleColor(
    image: RawImageData,
    sourceHex: string,
    targetHex: string,
    tolerance = 40,
  ): RawImageData {
    return this.swapColor(image, sourceHex, targetHex, tolerance);
  }

  // ---- Tonal adjustments ----

  /** Full filter pipeline: brightness, contrast, saturation, hue, temperature, highlights, shadows, exposure */
  public applyFilters(
    image: RawImageData,
    config: ColorFilterConfig,
  ): RawImageData {
    try {
      const data = new Uint8ClampedArray(image.data);
      const {
        brightness = 0,
        contrast = 0,
        saturation = 0,
        hueShift = 0,
        temperature = 0,
        tint = 0,
        highlights = 0,
        shadows = 0,
        exposure = 0,
      } = config;

      const expMul = Math.pow(2, exposure);
      const contrastFactor =
        (259 * (contrast + 255)) / (255 * (259 - contrast));

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i],
          g = data[i + 1],
          b = data[i + 2];

        // Exposure
        r *= expMul;
        g *= expMul;
        b *= expMul;

        // Brightness
        r += brightness;
        g += brightness;
        b += brightness;

        // Contrast
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        // Temperature (warm/cool)
        r += temperature * 0.8;
        b -= temperature * 0.8;
        g += tint * 0.4;

        // Highlights/Shadows
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 180) {
          // highlights
          const boost = (highlights / 100) * 30;
          r += boost;
          g += boost;
          b += boost;
        } else if (lum < 80) {
          // shadows
          const lift = (shadows / 100) * 30;
          r += lift;
          g += lift;
          b += lift;
        }

        // Hue + Saturation
        if (hueShift !== 0 || saturation !== 0) {
          const hsl = this._rgbToHsl(r, g, b);
          if (hueShift !== 0) hsl.h = (hsl.h + hueShift + 360) % 360;
          if (saturation !== 0)
            hsl.s = Math.max(0, Math.min(100, hsl.s + saturation));
          const rgb = this._hslToRgb(hsl.h, hsl.s, hsl.l);
          r = rgb.r;
          g = rgb.g;
          b = rgb.b;
        }

        data[i] = this._clamp(r);
        data[i + 1] = this._clamp(g);
        data[i + 2] = this._clamp(b);
      }

      // Sharpness (simple unsharp mask approximation)
      if (config.sharpness && config.sharpness > 0) {
        return this._applySharpness(
          { width: image.width, height: image.height, data },
          config.sharpness,
        );
      }

      // Vignette
      if (config.vignette && config.vignette > 0) {
        return this._applyVignette(
          { width: image.width, height: image.height, data },
          config.vignette,
        );
      }

      return { width: image.width, height: image.height, data };
    } catch {
      return image;
    }
  }

  // ---- Preset filters ----

  /** Convert to true black & white (luminance-based) */
  public toBlackAndWhite(image: RawImageData): RawImageData {
    try {
      const data = new Uint8ClampedArray(image.data);
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(
          0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2],
        );
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      return { width: image.width, height: image.height, data };
    } catch {
      return image;
    }
  }

  /** Apply sepia tone */
  public toSepia(image: RawImageData, intensity = 1.0): RawImageData {
    try {
      const data = new Uint8ClampedArray(image.data);
      const k = Math.min(1, Math.max(0, intensity));
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2];
        data[i] = this._clamp(
          r * (1 - 0.607 * k) + g * 0.769 * k + b * 0.189 * k,
        );
        data[i + 1] = this._clamp(
          r * 0.349 * k + g * (1 - 0.314 * k) + b * 0.168 * k,
        );
        data[i + 2] = this._clamp(
          r * 0.272 * k + g * 0.534 * k + b * (1 - 0.869 * k),
        );
      }
      return { width: image.width, height: image.height, data };
    } catch {
      return image;
    }
  }

  /** Apply blue/cool tone filter */
  public toBlueTone(image: RawImageData, intensity = 50): RawImageData {
    return this.applyFilters(image, {
      temperature: -intensity,
      saturation: intensity * 0.3,
    });
  }

  /** Apply warm/orange tone */
  public toWarmTone(image: RawImageData, intensity = 50): RawImageData {
    return this.applyFilters(image, {
      temperature: intensity,
      saturation: intensity * 0.2,
    });
  }

  /** Invert colors */
  public invert(image: RawImageData): RawImageData {
    try {
      const data = new Uint8ClampedArray(image.data);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];
        data[i + 1] = 255 - data[i + 1];
        data[i + 2] = 255 - data[i + 2];
      }
      return { width: image.width, height: image.height, data };
    } catch {
      return image;
    }
  }

  /** Shift hue by degrees (-180 to 180) */
  public shiftHue(image: RawImageData, degrees: number): RawImageData {
    return this.applyFilters(image, { hueShift: degrees });
  }

  /** Adjust saturation */
  public adjustSaturation(image: RawImageData, amount: number): RawImageData {
    return this.applyFilters(image, { saturation: amount });
  }

  /** Adjust brightness */
  public adjustBrightness(image: RawImageData, amount: number): RawImageData {
    return this.applyFilters(image, { brightness: amount });
  }

  /** Adjust contrast */
  public adjustContrast(image: RawImageData, amount: number): RawImageData {
    return this.applyFilters(image, { contrast: amount });
  }

  /** Boost highlights (-100 to 100) */
  public adjustHighlights(image: RawImageData, amount: number): RawImageData {
    return this.applyFilters(image, { highlights: amount });
  }

  /** Apply simple box blur */
  public blur(image: RawImageData, radius = 3): RawImageData {
    try {
      const { width, height } = image;
      const src = new Uint8ClampedArray(image.data);
      const out = new Uint8ClampedArray(src.length);
      const r2 = Math.max(1, Math.round(radius));

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let sumR = 0,
            sumG = 0,
            sumB = 0,
            sumA = 0,
            count = 0;
          for (let ky = -r2; ky <= r2; ky++) {
            for (let kx = -r2; kx <= r2; kx++) {
              const nx = Math.min(Math.max(x + kx, 0), width - 1);
              const ny = Math.min(Math.max(y + ky, 0), height - 1);
              const idx = (ny * width + nx) * 4;
              sumR += src[idx];
              sumG += src[idx + 1];
              sumB += src[idx + 2];
              sumA += src[idx + 3];
              count++;
            }
          }
          const oi = (y * width + x) * 4;
          out[oi] = sumR / count;
          out[oi + 1] = sumG / count;
          out[oi + 2] = sumB / count;
          out[oi + 3] = sumA / count;
        }
      }
      return { width, height, data: out };
    } catch {
      return image;
    }
  }

  // ---- Analysis ----

  /** Get image pixel statistics (avg color, brightness, dominant colors) */
  public getStats(image: RawImageData): ImageStats {
    try {
      const data = Array.from(image.data);
      const pixels = data.length / 4;
      let sumR = 0,
        sumG = 0,
        sumB = 0,
        hasTransparency = false;
      const colorMap = new Map<string, number>();

      for (let i = 0; i < data.length; i += 4) {
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
        if (data[i + 3] < 255) hasTransparency = true;
        // Quantize to 6-bit for dominant color detection
        const hex = this._rgbToHex(
          Math.round(data[i] / 32) * 32,
          Math.round(data[i + 1] / 32) * 32,
          Math.round(data[i + 2] / 32) * 32,
        );
        colorMap.set(hex, (colorMap.get(hex) ?? 0) + 1);
      }

      const avgR = Math.round(sumR / pixels),
        avgG = Math.round(sumG / pixels),
        avgB = Math.round(sumB / pixels);
      const avgBrightness = Math.round(
        0.299 * avgR + 0.587 * avgG + 0.114 * avgB,
      );

      const dominantColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([hex, count]) => ({
          hex,
          count,
          percentage: Number(((count / pixels) * 100).toFixed(1)),
        }));

      return {
        width: image.width,
        height: image.height,
        totalPixels: pixels,
        avgR,
        avgG,
        avgB,
        avgBrightness,
        dominantColors,
        hasTransparency,
      };
    } catch {
      return {
        width: image.width,
        height: image.height,
        totalPixels: 0,
        avgR: 0,
        avgG: 0,
        avgB: 0,
        avgBrightness: 0,
        dominantColors: [],
        hasTransparency: false,
      };
    }
  }

  // ---- Private helpers ----

  private _applySharpness(image: RawImageData, amount: number): RawImageData {
    try {
      const { width, height } = image;
      const src = new Uint8ClampedArray(image.data);
      const out = new Uint8ClampedArray(src);
      const k = amount / 100;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const ci = (y * width + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = src[ci + c];
            const neighbors =
              src[ci - 4 + c] +
              src[ci + 4 + c] +
              src[ci - width * 4 + c] +
              src[ci + width * 4 + c];
            out[ci + c] = this._clamp(center + k * (4 * center - neighbors));
          }
        }
      }
      return { width, height, data: out };
    } catch {
      return image;
    }
  }

  private _applyVignette(image: RawImageData, amount: number): RawImageData {
    try {
      const { width, height } = image;
      const data = new Uint8ClampedArray(image.data);
      const cx = width / 2,
        cy = height / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      const strength = amount / 100;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = x - cx,
            dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
          const factor = 1 - strength * dist * dist;
          const i = (y * width + x) * 4;
          data[i] = this._clamp(data[i] * factor);
          data[i + 1] = this._clamp(data[i + 1] * factor);
          data[i + 2] = this._clamp(data[i + 2] * factor);
        }
      }
      return { width, height, data };
    } catch {
      return image;
    }
  }

  private _colorDist(
    r1: number,
    g1: number,
    b1: number,
    r2: number,
    g2: number,
    b2: number,
  ): number {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  }

  private _clamp(v: number): number {
    return Math.max(0, Math.min(255, Math.round(v)));
  }

  private _hexToRgb(hex: string): { r: number; g: number; b: number } {
    let c = hex.trim().replace('#', '');
    if (c.length === 3)
      c = c
        .split('')
        .map((x) => x + x)
        .join('');
    return {
      r: parseInt(c.slice(0, 2), 16) || 0,
      g: parseInt(c.slice(2, 4), 16) || 0,
      b: parseInt(c.slice(4, 6), 16) || 0,
    };
  }

  private _rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'))
        .join('')
    );
  }

  private _rgbToHsl(
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

  private _hslToRgb(
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
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return {
      r: Math.round(hue(p, q, h + 1 / 3) * 255),
      g: Math.round(hue(p, q, h) * 255),
      b: Math.round(hue(p, q, h - 1 / 3) * 255),
    };

  }
}
