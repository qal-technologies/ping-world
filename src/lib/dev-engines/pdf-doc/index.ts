export interface PDFDocOptions {
  title?: string;
  author?: string;
  subject?: string;
  fontSize?: number;
  margins?: { top: number; right: number; bottom: number; left: number };
  pageSize?: 'A4' | 'LETTER';
  orientation?: 'portrait' | 'landscape';
}

export class PDFDocEngine {
  public createPDF(content: string, options: PDFDocOptions = {}): { blobUrl?: string; rawPdf: string; mimeType: string } {
    try {
      const title = options.title || 'Document';
      const cleanContent = content.replace(/[^\x20-\x7E\n\r\t]/g, ''); // sanitize ASCII

      // Pure raw PDF 1.4 syntax engine
      const streamText = `BT /F1 12 Tf 50 750 Td (${this.escapePdfText(title)}) Tj ET\nBT /F1 10 Tf 50 700 Td (${this.escapePdfText(cleanContent)}) Tj ET`;
      const streamLength = streamText.length;

      const pdfHeader = '%PDF-1.4\n';
      const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
      const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
      const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n`;
      const obj4 = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
      const obj5 = `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamText}\nendstream\nendobj\n`;

      const body = pdfHeader + obj1 + obj2 + obj3 + obj4 + obj5;
      const xrefOffset = body.length;

      const xref = `xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000242 00000 n \n0000000311 00000 n \n`;
      const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

      const rawPdf = body + xref + trailer;

      return {
        rawPdf,
        mimeType: 'application/pdf',
      };
    } catch (e) {
      throw new Error(`PDF generation failed: ${(e as Error).message}`);
    }
  }

  public createDoc(content: string, options: PDFDocOptions = {}): { rawDoc: string; mimeType: string } {
    try {
      const title = options.title || 'Document';
      const htmlDoc = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${title}</title>
          <style>
            body { font-family: 'Calibri', 'Arial', sans-serif; font-size: ${options.fontSize || 11}pt; margin: 40pt; }
            h1 { color: #0f172a; font-size: 20pt; }
            p { line-height: 1.5; margin-bottom: 10pt; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div>${content.replace(/\n/g, '<br/>')}</div>
        </body>
        </html>
      `;

      return {
        rawDoc: htmlDoc,
        mimeType: 'application/msword',
      };
    } catch (e) {
      throw new Error(`Doc generation failed: ${(e as Error).message}`);
    }
  }

  public parseDocument(input: string): { title: string; bodyText: string; charCount: number } {
    try {
      const cleanText = input.replace(/<[^>]*>?/gm, '');
      const firstLine = cleanText.split('\n')[0] || 'Untitled';
      return {
        title: firstLine.substring(0, 50),
        bodyText: cleanText,
        charCount: cleanText.length,
      };
    } catch (e) {
      return { title: 'Error', bodyText: '', charCount: 0 };
    }
  }

  private escapePdfText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
