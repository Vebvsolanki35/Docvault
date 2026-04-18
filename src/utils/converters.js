import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Process an image blob: resize if wider than maxWidth and re-encode as JPEG.
 * @param {Blob} blob
 * @param {number} maxWidth
 * @param {number} quality
 * @returns {Promise<Blob>}
 */
export async function processImage(blob, maxWidth = 1600, quality = 0.88) {
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  let targetWidth = width;
  let targetHeight = height;

  if (width > maxWidth) {
    targetWidth = maxWidth;
    targetHeight = Math.round((height / width) * maxWidth);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Convert a PDF blob to an array of image blobs (one per page).
 * @param {Blob} pdfBlob
 * @param {number} scale
 * @returns {Promise<Blob[]>}
 */
export async function pdfToImages(pdfBlob, scale = 1.5) {
  const arrayBuffer = await pdfBlob.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;
  const blobs = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const pageBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error(`toBlob failed for page ${i}`));
        },
        'image/png',
      );
    });

    blobs.push(pageBlob);
  }

  return blobs;
}

const PRESETS = {
  passport: { width: 413, height: 531 },
  stamp: { width: 150, height: 150 },
  a4: { width: 2480, height: 3508 },
};

/**
 * Resize an image blob to a named preset (or keep original dimensions).
 * @param {Blob} blob
 * @param {'image/jpeg'|'image/png'} format
 * @param {'passport'|'stamp'|'a4'|'original'} preset
 * @returns {Promise<Blob>}
 */
export async function resizeImageForExport(blob, format, preset) {
  const bitmap = await createImageBitmap(blob);

  let targetWidth = bitmap.width;
  let targetHeight = bitmap.height;

  if (preset !== 'original' && PRESETS[preset]) {
    targetWidth = PRESETS[preset].width;
    targetHeight = PRESETS[preset].height;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Canvas toBlob failed'));
      },
      format,
    );
  });
}

/**
 * Wrap an image blob in a minimal single-page PDF.
 * @param {Blob} imageBlob
 * @returns {Promise<Blob>}
 */
export async function blobToPdfBlob(imageBlob) {
  const bitmap = await createImageBitmap(imageBlob);
  const { width, height } = bitmap;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  // Convert canvas to a JPEG data URL, then embed it in a minimal PDF.
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64Data = dataUrl.split(',')[1];

  // Decode base64 to byte array.
  const binaryStr = atob(base64Data);
  const imageBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    imageBytes[i] = binaryStr.charCodeAt(i);
  }

  // Build a minimal valid PDF with one JPEG image filling the page.
  const enc = new TextEncoder();

  const imageLength = imageBytes.length;

  // Object 1: Catalog
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  // Object 2: Pages
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
  // Object 3: Page
  const obj3 =
    `3 0 obj\n<< /Type /Page /Parent 2 0 R ` +
    `/MediaBox [0 0 ${width} ${height}] ` +
    `/Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>\nendobj\n`;
  // Object 4: Content stream
  const contentStream = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
  const obj4 =
    `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n` +
    `${contentStream}\nendstream\nendobj\n`;
  // Object 5: Image XObject
  const obj5Header =
    `5 0 obj\n<< /Type /XObject /Subtype /Image ` +
    `/Width ${width} /Height ${height} /ColorSpace /DeviceRGB ` +
    `/BitsPerComponent 8 /Filter /DCTDecode /Length ${imageLength} >>\nstream\n`;
  const obj5Footer = '\nendstream\nendobj\n';

  const header = enc.encode('%PDF-1.4\n');
  const b1 = enc.encode(obj1);
  const b2 = enc.encode(obj2);
  const b3 = enc.encode(obj3);
  const b4 = enc.encode(obj4);
  const b5Header = enc.encode(obj5Header);
  const b5Footer = enc.encode(obj5Footer);

  // Calculate byte offsets for xref table.
  const objectParts = [b1, b2, b3, b4, b5Header];
  const offsets = [];
  let offset = header.length;
  for (const part of objectParts) {
    offsets.push(offset);
    offset += part.length;
  }
  const xrefOffset = offset + imageBytes.length + b5Footer.length;

  const xref =
    'xref\n' +
    `0 6\n` +
    `0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('') +
    'trailer\n' +
    `<< /Size 6 /Root 1 0 R >>\n` +
    'startxref\n' +
    `${xrefOffset}\n` +
    '%%EOF\n';

  const xrefBytes = enc.encode(xref);

  // Assemble all parts.
  const parts = [header, b1, b2, b3, b4, b5Header, imageBytes, b5Footer, xrefBytes];
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const output = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    output.set(part, pos);
    pos += part.length;
  }

  return new Blob([output], { type: 'application/pdf' });
}
