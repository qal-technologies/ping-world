type ZipEntry = {
  name: string;
  compressedSize: number;
  uncompressedSize: number;
  compression: number;
  crc: number;
  localOffset: number;
  flags: number;
};

export interface RangeZipFile {
  async(type: 'text'): Promise<string>;
  async(type: 'blob'): Promise<Blob>;
}

export interface RangeZipArchive {
  files: Record<string, { name: string }>;
  file(name: string): RangeZipFile | null;
}

const readU16 = (view: DataView, offset: number) => view.getUint16(offset, true);
const readU32 = (view: DataView, offset: number) => view.getUint32(offset, true);

async function fullArchiveFallback(responseOrBlob: Response | Blob): Promise<RangeZipArchive> {
  const JSZip = (await import('jszip')).default;
  const blob = responseOrBlob instanceof Blob ? responseOrBlob : await responseOrBlob.blob();
  // ArrayBuffer is accepted consistently by browser and Node JSZip loaders.
  const loaded = await JSZip.loadAsync(await blob.arrayBuffer());
  return loaded as unknown as RangeZipArchive;
}

function readZipFile(file: RangeZipFile, outputType: 'text' | 'blob') {
  return outputType === 'text' ? file.async('text') : file.async('blob');
}

/**
 * Read a ZIP central directory and individual entries with HTTP byte ranges.
 * If the URL is local or its server ignores Range, JSZip reads the response as
 * a Blob instead. This avoids holding an extra full archive ArrayBuffer for
 * range-capable remote documents and keeps normal browser/network constraints
 * as the only size boundary.
 */
export async function openRangeZip(src: string, knownSize?: number, signal?: AbortSignal): Promise<RangeZipArchive> {
  const fetchRange = (range: string) => fetch(src, {
    headers: { Range: range },
    credentials: 'omit',
    cache: 'no-store',
    signal,
  });

  const tailResponse = await fetchRange('bytes=-65557');
  if (!tailResponse.ok) throw new Error('Could not read this document.');
  if (tailResponse.status !== 206) return fullArchiveFallback(tailResponse);
  const tail = new Uint8Array(await tailResponse.arrayBuffer());
  const contentRange = tailResponse.headers.get('content-range');
  const totalSize = Number(contentRange?.match(/\/(\d+)$/)?.[1] || knownSize);
  if (!Number.isSafeInteger(totalSize) || totalSize <= 0 || tail.length > totalSize)
    throw new Error('This document server returned an invalid byte range.');

  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let eocdOffset = -1;
  for (let index = tail.length - 22; index >= Math.max(0, tail.length - 65557); index--) {
    if (readU32(tailView, index) === 0x06054b50) {
      const commentLength = readU16(tailView, index + 20);
      if (index + 22 + commentLength === tail.length) { eocdOffset = index; break; }
    }
  }
  if (eocdOffset < 0) throw new Error('This ZIP document has no readable directory.');
  const diskNumber = readU16(tailView, eocdOffset + 4);
  const directoryDisk = readU16(tailView, eocdOffset + 6);
  const entriesOnDisk = readU16(tailView, eocdOffset + 8);
  const entryCount = readU16(tailView, eocdOffset + 10);
  const directorySize = readU32(tailView, eocdOffset + 12);
  const directoryOffset = readU32(tailView, eocdOffset + 16);
  if (diskNumber || directoryDisk || entriesOnDisk !== entryCount || entryCount === 0xffff || directoryOffset === 0xffffffff || directorySize === 0xffffffff)
    throw new Error('This ZIP variant is not supported for streamed preview.');

  const directoryEnd = directoryOffset + directorySize;
  if (!Number.isSafeInteger(directoryEnd) || directoryEnd > totalSize)
    throw new Error('This ZIP document has an invalid directory.');
  let directory = new Uint8Array();
  if (directorySize) {
    const directoryResponse = await fetchRange(`bytes=${directoryOffset}-${directoryEnd - 1}`);
    if (!directoryResponse.ok) throw new Error('Could not read the document index.');
    if (directoryResponse.status !== 206) return fullArchiveFallback(directoryResponse);
    directory = new Uint8Array(await directoryResponse.arrayBuffer());
    if (directory.length !== directorySize) throw new Error('The document index was incomplete.');
  }

  const view = new DataView(directory.buffer, directory.byteOffset, directory.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();
  let cursor = 0;
  while (cursor + 46 <= directory.length) {
    if (readU32(view, cursor) !== 0x02014b50) break;
    const flags = readU16(view, cursor + 8);
    const compression = readU16(view, cursor + 10);
    const crc = readU32(view, cursor + 16);
    const compressedSize = readU32(view, cursor + 20);
    const uncompressedSize = readU32(view, cursor + 24);
    const nameLength = readU16(view, cursor + 28);
    const extraLength = readU16(view, cursor + 30);
    const commentLength = readU16(view, cursor + 32);
    const localOffset = readU32(view, cursor + 42);
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (recordEnd > directory.length || compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff)
      throw new Error('This ZIP document uses unsupported ZIP64 entries.');
    const name = decoder.decode(directory.subarray(cursor + 46, cursor + 46 + nameLength));
    entries.set(name, { name, compressedSize, uncompressedSize, compression, crc, localOffset, flags });
    cursor = recordEnd;
  }

  const files = Object.fromEntries([...entries.keys()].map((name) => [name, { name }]));
  return {
    files,
    file(name: string) {
      const entry = entries.get(name);
      if (!entry) return null;
      const readEntry = async (outputType: 'text' | 'blob'): Promise<string | Blob> => {
          if (entry.flags & 1) throw new Error('This document entry is encrypted.');
          const localResponse = await fetchRange(`bytes=${entry.localOffset}-${entry.localOffset + 29}`);
          if (!localResponse.ok) throw new Error('Could not read a document entry.');
          if (localResponse.status !== 206) {
            const fallback = await fullArchiveFallback(localResponse);
            const fallbackFile = fallback.file(name);
            if (!fallbackFile) throw new Error('A document entry could not be found.');
            return readZipFile(fallbackFile, outputType);
          }
          const localHeader = new Uint8Array(await localResponse.arrayBuffer());
          if (localHeader.length !== 30) throw new Error('A document entry header was incomplete.');
          const localView = new DataView(localHeader.buffer, localHeader.byteOffset, localHeader.byteLength);
          if (readU32(localView, 0) !== 0x04034b50) throw new Error('A document entry header is invalid.');
          const dataOffset = entry.localOffset + 30 + readU16(localView, 26) + readU16(localView, 28);
          const compressedResponse = entry.compressedSize
            ? await fetchRange(`bytes=${dataOffset}-${dataOffset + entry.compressedSize - 1}`)
            : null;
          if (compressedResponse && (!compressedResponse.ok || compressedResponse.status !== 206)) {
            if (compressedResponse.status === 200) {
              const fallback = await fullArchiveFallback(compressedResponse);
              const fallbackFile = fallback.file(name);
              if (!fallbackFile) throw new Error('A document entry could not be found.');
              return readZipFile(fallbackFile, outputType);
            }
            throw new Error('Could not load a document entry.');
          }
          const compressed = compressedResponse ? new Uint8Array(await compressedResponse.arrayBuffer()) : new Uint8Array();
          if (compressed.length !== entry.compressedSize) throw new Error('A document entry was incomplete.');
          const archiveBytes = makeSingleEntryZip(entry, compressed, name);
          const JSZip = (await import('jszip')).default;
          const archive = await JSZip.loadAsync(archiveBytes);
          const item = archive.file(name);
          if (!item) throw new Error('A document entry could not be decoded.');
          return readZipFile(item as unknown as RangeZipFile, outputType);
      };
      return { async: readEntry as RangeZipFile['async'] };
    },
  };
}

function makeSingleEntryZip(entry: ZipEntry, compressed: Uint8Array, name: string): Uint8Array {
  const encoder = new TextEncoder();
  const filename = encoder.encode(name);
  const local = new Uint8Array(30 + filename.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(6, 0x0800, true);
  localView.setUint16(8, entry.compression, true);
  localView.setUint32(14, entry.crc, true);
  localView.setUint32(18, entry.compressedSize, true);
  localView.setUint32(22, entry.uncompressedSize, true);
  localView.setUint16(26, filename.length, true);
  local.set(filename, 30);

  const central = new Uint8Array(46 + filename.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(4, 20, true);
  centralView.setUint16(6, 20, true);
  centralView.setUint16(8, 0x0800, true);
  centralView.setUint16(10, entry.compression, true);
  centralView.setUint32(16, entry.crc, true);
  centralView.setUint32(20, entry.compressedSize, true);
  centralView.setUint32(24, entry.uncompressedSize, true);
  centralView.setUint16(28, filename.length, true);
  central.set(filename, 46);

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, 1, true);
  endView.setUint16(10, 1, true);
  endView.setUint32(12, central.length, true);
  endView.setUint32(16, local.length + compressed.length, true);
  const archive = new Uint8Array(local.length + compressed.length + central.length + end.length);
  archive.set(local, 0);
  archive.set(compressed, local.length);
  archive.set(central, local.length + compressed.length);
  archive.set(end, local.length + compressed.length + central.length);
  return archive;
}
