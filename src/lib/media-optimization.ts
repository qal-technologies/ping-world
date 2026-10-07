/** Resize still images for display/storage while retaining the source in local state. */
export async function optimizeImageForStorage(input: Blob, maxDimension = 2400, quality = 0.82): Promise<Blob> {
  if (!input.type.startsWith('image/') || input.type === 'image/svg+xml' || input.type === 'image/gif') return input;
  if (typeof createImageBitmap === 'undefined') return input;

  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(input);
    if (!bitmap.width || !bitmap.height) return input;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    if (scale === 1 && input.size < 180 * 1024) return input;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return input;
    context.drawImage(bitmap, 0, 0, width, height);
    const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    return compressed && compressed.size < input.size ? compressed : input;
  } catch {
    // Keep unusual/unsupported formats intact rather than failing a submission.
    return input;
  } finally {
    bitmap?.close();
  }
}
