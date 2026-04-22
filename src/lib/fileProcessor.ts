import * as XLSX from 'xlsx';

export type FileAttachmentKind = 'text' | 'image';

export interface ProcessedFile {
  name: string;
  kind: FileAttachmentKind;
  mimeType: string;
  /** text content or base64 data URL (data:image/...;base64,...) */
  data: string;
}

const MAX_TEXT_CHARS = 30_000;

const EXT_MIME: Record<string, string> = {
  txt: 'text/plain',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
};

function resolvedMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MIME[ext] ?? '';
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
    reader.readAsText(file, 'UTF-8');
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
    reader.readAsDataURL(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
    reader.readAsArrayBuffer(file);
  });
}

async function xlsxToText(file: File): Promise<string> {
  const buffer = await readAsArrayBuffer(file);
  const wb = XLSX.read(buffer, { type: 'array' });
  return wb.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
    return csv.trim() ? `--- Tabelle: ${name} ---\n${csv}` : '';
  })
    .filter(Boolean)
    .join('\n\n');
}

async function pdfToText(file: File): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const buffer = await readAsArrayBuffer(file);
  const pdf = await getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => {
        if ('str' in item) return (item as { str: string }).str;
        return '';
      })
      .join(' ')
      .trim();
    if (text) pages.push(`[Seite ${i}]\n${text}`);
  }

  return pages.join('\n\n');
}

export async function processFile(file: File): Promise<ProcessedFile> {
  const mime = resolvedMime(file);

  if (mime === 'text/plain' || mime === 'text/csv') {
    const text = await readAsText(file);
    return { name: file.name, kind: 'text', mimeType: mime, data: text.slice(0, MAX_TEXT_CHARS) };
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel'
  ) {
    const text = await xlsxToText(file);
    return { name: file.name, kind: 'text', mimeType: mime, data: text.slice(0, MAX_TEXT_CHARS) };
  }

  if (mime === 'application/pdf') {
    const text = await pdfToText(file);
    return { name: file.name, kind: 'text', mimeType: mime, data: text.slice(0, MAX_TEXT_CHARS) };
  }

  if (mime.startsWith('image/')) {
    if (mime === 'image/tiff') {
      throw new Error('TIFF wird von der KI-Vision nicht unterstützt. Bitte als PNG oder JPEG speichern.');
    }
    const dataUrl = await readAsDataUrl(file);
    return { name: file.name, kind: 'image', mimeType: mime, data: dataUrl };
  }

  throw new Error(`Dateityp nicht unterstützt: ${mime || file.name}`);
}

export const ACCEPTED_MIME_TYPES = [
  'text/plain',
  'text/csv',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
].join(',');

export const ACCEPTED_EXTENSIONS = '.txt,.csv,.pdf,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.webp,.tiff,.tif';
