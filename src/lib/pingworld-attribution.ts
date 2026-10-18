import { COMPANY } from '@/lib/config/company';

export const PINGWORLD_ATTRIBUTION_MARKER = 'PINGWORLD_MADE_WITH_V1';
export const PINGWORLD_ATTRIBUTION_TEXT = `Made with PingWorld · ${COMPANY.domain}`;

const utf8 = new TextEncoder();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length, false);
  const typeBytes = utf8.encode(type);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)), false);
  return chunk;
}

function xmpPacket(): Uint8Array {
  const text = `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:pingworld="https://ping-world.site/ns/attribution/1.0/" pingworld:tag="${PINGWORLD_ATTRIBUTION_MARKER}" pingworld:label="${PINGWORLD_ATTRIBUTION_TEXT}"/></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;
  return utf8.encode(text);
}

export function hasPingWorldAttribution(bytes: ArrayBuffer | Uint8Array): boolean {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const marker = utf8.encode(PINGWORLD_ATTRIBUTION_MARKER);
  outer: for (let start = 0; start <= data.length - marker.length; start++) {
    for (let index = 0; index < marker.length; index++) if (data[start + index] !== marker[index]) continue outer;
    return true;
  }
  return false;
}

/** Add standards-compatible metadata for PNG, JPEG and WebP images. */
export async function tagImageBlob(blob: Blob): Promise<Blob> {
  const input = new Uint8Array(await blob.arrayBuffer());
  if (hasPingWorldAttribution(input)) return blob;
  const type = blob.type.toLowerCase();
  const signaturePng = input.length > 8 && input[0] === 0x89 && input[1] === 0x50 && input[2] === 0x4e && input[3] === 0x47;
  const signatureJpeg = input.length > 4 && input[0] === 0xff && input[1] === 0xd8;
  const signatureWebp = input.length > 12 && String.fromCharCode(...input.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...input.subarray(8, 12)) === 'WEBP';
  const label = `${PINGWORLD_ATTRIBUTION_TEXT}|${PINGWORLD_ATTRIBUTION_MARKER}`;

  if (signaturePng || type === 'image/png') {
    const textData = new Uint8Array(7 + utf8.encode(label).length);
    textData.set(utf8.encode('Comment\0'));
    textData.set(utf8.encode(label), 7);
    const tag = pngChunk('tEXt', textData);
    const parts: Uint8Array[] = [input.subarray(0, 8)];
    let offset = 8;
    while (offset + 12 <= input.length) {
      const length = new DataView(input.buffer, input.byteOffset + offset, 4).getUint32(0, false);
      const end = offset + 12 + length;
      if (end > input.length) return blob;
      const chunkType = String.fromCharCode(...input.subarray(offset + 4, offset + 8));
      parts.push(input.subarray(offset, end));
      if (chunkType === 'IHDR') parts.push(tag);
      offset = end;
      if (chunkType === 'IEND') break;
    }
    if (offset < input.length) parts.push(input.subarray(offset));
    const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
    let outputOffset = 0;
    for (const part of parts) {
      output.set(part, outputOffset);
      outputOffset += part.length;
    }
    return new Blob([output.buffer as ArrayBuffer], { type: blob.type || 'image/png' });
  }

  if (signatureJpeg || type === 'image/jpeg' || type === 'image/jpg') {
    const namespace = utf8.encode('http://ns.adobe.com/xap/1.0/\0');
    const packet = xmpPacket();
    const payload = new Uint8Array(namespace.length + packet.length);
    payload.set(namespace); payload.set(packet, namespace.length);
    if (payload.length + 2 > 0xffff) return blob;
    const segment = new Uint8Array(payload.length + 4);
    segment[0] = 0xff; segment[1] = 0xe1;
    new DataView(segment.buffer).setUint16(2, payload.length + 2, false);
    segment.set(payload, 4);
    return new Blob([input.subarray(0, 2), segment, input.subarray(2)], { type: blob.type || 'image/jpeg' });
  }

  if (signatureWebp || type === 'image/webp') {
    const payload = xmpPacket();
    const paddedLength = payload.length + (payload.length % 2);
    const chunk = new Uint8Array(8 + paddedLength);
    chunk.set(utf8.encode('XMP '), 0);
    new DataView(chunk.buffer).setUint32(4, payload.length, true);
    chunk.set(payload, 8);
    const output = new Uint8Array(input.length + chunk.length);
    output.set(input.subarray(0, 12)); output.set(chunk, 12); output.set(input.subarray(12), 12 + chunk.length);
    new DataView(output.buffer).setUint32(4, output.length - 8, true);
    return new Blob([output], { type: blob.type || 'image/webp' });
  }
  return blob;
}

/** Add attribution to structured/text exports without changing binary media formats. */
export function tagTextExport(content: string, format: 'json' | 'csv' | 'text'): string {
  if (format === 'json') {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify({
        _pingworldAttribution: { tag: PINGWORLD_ATTRIBUTION_MARKER, madeWith: 'PingWorld', url: COMPANY.domain },
        ...parsed,
      }, null, 2);
    } catch { return content; }
  }
  const footer = `Made with PingWorld · ${COMPANY.domain}\n${PINGWORLD_ATTRIBUTION_MARKER}`;
  return `${content}${content ? '\n' : ''}${format === 'csv' ? `# ${footer.replaceAll('\n', ' | ')}` : footer}`;
}

type AttributableJsPdf = {
  setProperties?: (properties: Record<string, string>) => void;
  internal?: {
    getNumberOfPages?: () => number;
    getCurrentPageInfo?: () => { pageNumber?: number };
    pageSize?: { getHeight?: () => number; getWidth?: () => number };
  };
  setPage?: (page: number) => void;
  setFontSize?: (size: number) => void;
  setTextColor?: (red: number, green: number, blue: number) => void;
  text?: (text: string, x: number, y: number, options?: { align?: 'left' | 'center' | 'right' }) => void;
};

type AttributablePdfLib = {
  setSubject?: (subject: string) => void;
  setKeywords?: (keywords: string[]) => void;
  setCreator?: (creator: string) => void;
  setProducer?: (producer: string) => void;
  getPages?: () => Array<{
    getSize?: () => { width: number; height: number };
    drawText?: (text: string, options: { x: number; y: number; size: number; opacity: number }) => void;
  }>;
};

export function tagJsPdfDocument(doc: AttributableJsPdf): void {
  try {
    doc.setProperties?.({
      subject: PINGWORLD_ATTRIBUTION_TEXT,
      keywords: `PingWorld ${PINGWORLD_ATTRIBUTION_MARKER} ${COMPANY.domain}`,
      creator: 'PingWorld',
    });
    const pages = doc.internal?.getNumberOfPages?.() || 1;
    const originalPage = doc.internal?.getCurrentPageInfo?.().pageNumber || pages;
    const height = doc.internal?.pageSize?.getHeight?.() || 842;
    const width = doc.internal?.pageSize?.getWidth?.() || 595;
    if (!doc.setPage) return;
    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      doc.setFontSize?.(7);
      doc.setTextColor?.(125, 125, 125);
      doc.text?.(`${PINGWORLD_ATTRIBUTION_TEXT} · ${PINGWORLD_ATTRIBUTION_MARKER}`, width / 2, height - 10, { align: 'center' });
    }
    doc.setPage(originalPage);
  } catch { /* Metadata is best-effort for PDF implementations without jsPDF APIs. */ }
}

export function tagPdfLibDocument(doc: AttributablePdfLib): void {
  try {
    doc.setSubject?.(PINGWORLD_ATTRIBUTION_TEXT);
    doc.setKeywords?.([PINGWORLD_ATTRIBUTION_MARKER, COMPANY.domain, 'PingWorld']);
    doc.setCreator?.('PingWorld');
    doc.setProducer?.('PingWorld');
    for (const page of doc.getPages?.() || []) {
      const size = page.getSize?.();
      if (!size) continue;
      page.drawText?.(`Made with PingWorld | ${COMPANY.domain} | ${PINGWORLD_ATTRIBUTION_MARKER}`, {
        x: 18,
        y: 8,
        size: 5,
        opacity: 0.45,
      });
    }
  } catch { /* Keep PDF exports usable if a library version omits metadata setters. */ }
}

export function tagHtmlDocument(html: string): string {
  const metadata = `<meta name="pingworld-attribution" content="${PINGWORLD_ATTRIBUTION_MARKER}"><meta name="generator" content="PingWorld">`;
  const footer = `<footer style="margin-top:2em;padding-top:.5em;border-top:1px solid #ddd;text-align:center;font:10px sans-serif;color:#777">${PINGWORLD_ATTRIBUTION_TEXT} · ${PINGWORLD_ATTRIBUTION_MARKER}</footer>`;
  return html.includes(PINGWORLD_ATTRIBUTION_MARKER) ? html :
    html.replace(/<\/head>/i, `${metadata}</head>`).replace(/<\/body>/i, `${footer}</body>`);
}

/** Embed a searchable attribution record in ZIP based office/book containers. */
export async function tagZipExport(blob: Blob): Promise<Blob> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(blob);
    const record = JSON.stringify({ tag: PINGWORLD_ATTRIBUTION_MARKER, madeWith: 'PingWorld', url: COMPANY.domain });
    zip.file('_pingworld/attribution.json', record);
    if (zip.file('[Content_Types].xml')) {
      const contentTypes = await zip.file('[Content_Types].xml')!.async('text');
      if (!contentTypes.includes('/docProps/core.xml'))
        zip.file('[Content_Types].xml', contentTypes.replace('</Types>', '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'));
      const relationships = await zip.file('_rels/.rels')?.async('text');
      if (relationships && !relationships.includes('/metadata/core-properties'))
        zip.file('_rels/.rels', relationships.replace('</Relationships>', '<Relationship Id="rIdPingWorldCore" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'));
      const xmlEscape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>PingWorld</dc:creator><dc:description>${xmlEscape(PINGWORLD_ATTRIBUTION_TEXT)} · ${PINGWORLD_ATTRIBUTION_MARKER}</dc:description><cp:keywords>PingWorld, ${PINGWORLD_ATTRIBUTION_MARKER}, ${xmlEscape(COMPANY.domain)}</cp:keywords></cp:coreProperties>`);
    }
    return await zip.generateAsync({ type: 'blob', mimeType: blob.type });
  } catch { return blob; }
}

/** Add standard RIFF INFO metadata to WAV files while preserving audio chunks. */
export async function tagWavBlob(blob: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length < 12 || String.fromCharCode(...bytes.subarray(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.subarray(8, 12)) !== 'WAVE') return blob;
  if (hasPingWorldAttribution(bytes)) return blob;
  const label = utf8.encode(`${PINGWORLD_ATTRIBUTION_TEXT} · ${PINGWORLD_ATTRIBUTION_MARKER}\0`);
  const padded = label.length + (label.length % 2);
  const info = new Uint8Array(16 + padded);
  info.set(utf8.encode('LIST'), 0);
  new DataView(info.buffer).setUint32(4, 8 + padded, true);
  info.set(utf8.encode('INFOICMT'), 8);
  info.set(label, 16);
  const output = new Uint8Array(bytes.length + info.length);
  output.set(bytes);
  output.set(info, bytes.length);
  new DataView(output.buffer).setUint32(4, output.length - 8, true);
  return new Blob([output.buffer as ArrayBuffer], { type: blob.type || 'audio/wav' });
}
