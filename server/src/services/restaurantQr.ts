import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export function restaurantQrUrl(slug: string, destination: 'home' | 'menu', table?: string) {
  const origin = new URL(process.env.PUBLIC_APP_URL || 'https://sofa-menu.onrender.com');
  if (origin.protocol !== 'https:' || origin.username || origin.password) throw new Error('PUBLIC_APP_URL must use HTTPS');
  const path = '/r/' + encodeURIComponent(slug) + (destination === 'menu' ? '/menu' : '');
  const url = new URL(path, origin);
  if (table) url.searchParams.set('table', table);
  return url.href;
}

export const qrOptions = { width: 480, margin: 4, errorCorrectionLevel: 'M' } as const;

export async function printableRestaurantQr(target: string, name: string, table?: string) {
  const document = await PDFDocument.create();
  const page = document.addPage([320, 420]);
  const serif = await document.embedFont(StandardFonts.TimesRomanBold);
  const sans = await document.embedFont(StandardFonts.Helvetica);
  const qr = await document.embedPng(await QRCode.toBuffer(target, qrOptions));
  const white = rgb(1, 1, 1);
  const ink = rgb(0.11, 0.10, 0.09);
  const gold = rgb(0.47, 0.34, 0.19);

  page.drawRectangle({ x: 0, y: 0, width: 320, height: 420, color: rgb(0.97, 0.95, 0.92) });
  page.drawRectangle({ x: 9, y: 9, width: 302, height: 402, borderColor: gold, borderWidth: 1 });
  page.drawCircle({ x: 160, y: 366, size: 18, color: white, borderColor: gold, borderWidth: 1 });
  const supportedName = Array.from(name).map(character => {
    try { serif.encodeText(character); return character; } catch { return '?'; }
  }).join('').trim();
  const safeTable = table?.replace(/[^ -~]/g, '?');

  const centered = (label: string, y: number, size: number, font: typeof sans, color = ink) => {
    const width = font.widthOfTextAtSize(label, size);
    const fit = width > 276 ? size * 276 / width : size;
    page.drawText(label, { x: (320 - font.widthOfTextAtSize(label, fit)) / 2, y, size: fit, font, color });
  };

  centered(supportedName[0] || 'S', 359, 20, serif, gold);
  centered(supportedName, 324, 25, serif);
  if (safeTable) centered('Stol ' + safeTable, 297, 14, sans, gold);
  page.drawImage(qr, { x: 49, y: 65, width: 222, height: 222 });
  centered('Menyuni ko‘rish uchun skanerlang', 42, 12, sans);
  return document.save();
}
