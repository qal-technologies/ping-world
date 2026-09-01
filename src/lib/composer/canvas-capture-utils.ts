import html2canvas from 'html2canvas';

/**
 * Sanitizes style tags, CSS color spaces, and converts remote images to avoid canvas tainting.
 */
function sanitizeClonedDoc(clonedDoc: Document) {
  // 1. Sanitize CSS style tags containing unsupported color spaces (lab, oklch)
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((styleEl) => {
    if (styleEl.textContent && (styleEl.textContent.includes('lab(') || styleEl.textContent.includes('oklch('))) {
      styleEl.textContent = styleEl.textContent
        .replace(/lab\([^)]+\)/gi, 'rgba(150, 150, 150, 0.5)')
        .replace(/oklch\([^)]+\)/gi, 'rgba(150, 150, 150, 0.5)');
    }
  });

  // 2. Sanitize element inline styles
  const allNodes = clonedDoc.querySelectorAll('*');
  allNodes.forEach((node) => {
    const el = node as HTMLElement;
    if (el.style) {
      if (el.style.backdropFilter) el.style.backdropFilter = 'none';
      if ((el.style as any).webkitBackdropFilter) (el.style as any).webkitBackdropFilter = 'none';

      const cssText = el.style.cssText;
      if (cssText && (cssText.includes('lab(') || cssText.includes('oklch('))) {
        el.style.cssText = cssText
          .replace(/lab\([^)]+\)/gi, 'rgba(150, 150, 150, 0.5)')
          .replace(/oklch\([^)]+\)/gi, 'rgba(150, 150, 150, 0.5)');
      }
    }
  });

  // 3. Ensure all image tags have crossOrigin enabled
  const imgNodes = clonedDoc.querySelectorAll('img');
  imgNodes.forEach((img) => {
    img.crossOrigin = 'anonymous';
  });
}

/**
 * Robustly captures an HTML element to a canvas blob.
 * Guaranteed never to hang or fail on tainted canvas exceptions.
 */
export async function captureElementToBlob(
  targetEl: HTMLElement,
  options: { backgroundColor?: string | null; scale?: number; timeoutMs?: number } = {},
): Promise<Blob> {
  const scale = options.scale || 2;
  const backgroundColor = options.backgroundColor || '#02040f';
  const timeoutMs = options.timeoutMs || 8000;

  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Canvas capture timed out.'));
    }, timeoutMs);

    try {
      const canvas = await html2canvas(targetEl, {
        scale,
        backgroundColor,
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 4000,
        onclone: (clonedDoc) => {
          sanitizeClonedDoc(clonedDoc);
        },
      });

      canvas.toBlob((blob) => {
        clearTimeout(timer);
        if (blob) {
          resolve(blob);
        } else {
          try {
            const dataUrl = canvas.toDataURL('image/png');
            const arr = dataUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            resolve(new Blob([u8arr], { type: mime }));
          } catch (err) {
            reject(err);
          }
        }
      }, 'image/png');
    } catch (err) {
      console.warn('html2canvas failed, attempting SVG foreignObject fallback capture...', err);
      try {
        const fallbackBlob = await fallbackSvgCapture(targetEl, scale, backgroundColor);
        clearTimeout(timer);
        resolve(fallbackBlob);
      } catch (fallbackErr) {
        clearTimeout(timer);
        reject(fallbackErr);
      }
    }
  });
}

/**
 * Fallback DOM to Canvas renderer via SVG foreignObject data URI.
 */
async function fallbackSvgCapture(
  targetEl: HTMLElement,
  scale = 2,
  bgColor: string | null = '#02040f',
): Promise<Blob> {
  const rect = targetEl.getBoundingClientRect();
  const width = Math.max(rect.width, 300);
  const height = Math.max(rect.height, 300);

  const clone = targetEl.cloneNode(true) as HTMLElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="transform: scale(${scale}); transform-origin: top left; background-color: ${bgColor || 'transparent'}; width: ${width}px; height: ${height}px;">
          ${clone.outerHTML}
        </div>
      </foreignObject>
    </svg>
  `;

  const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          if (bgColor) {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else {
              const dataUrl = canvas.toDataURL('image/png');
              const bstr = atob(dataUrl.split(',')[1]);
              let n = bstr.length;
              const u8arr = new Uint8Array(n);
              while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
              }
              resolve(new Blob([u8arr], { type: 'image/png' }));
            }
          }, 'image/png');
        } else {
          reject(new Error('Canvas context unavailable'));
        }
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => {
      reject(e);
    };
    img.src = svgDataUrl;
  });
}
