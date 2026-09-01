/**
 * Compresses an image Data URL or URL to JPEG format (max dimension 800px, quality 0.75)
 * to keep exported PDF documents lightweight (< 300KB instead of 15MB+).
 */
export async function compressImageForPdf(
  src: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.75,
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width || 400;
      let height = img.height || 400;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(width, 100);
      canvas.height = Math.max(height, 100);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve({ dataUrl, width: canvas.width, height: canvas.height });
          return;
        } catch (e) {
          // fallback to original src
        }
      }
      resolve({ dataUrl: src, width, height });
    };
    img.onerror = () => {
      resolve({ dataUrl: src, width: 400, height: 400 });
    };
    img.src = src;
  });
}
