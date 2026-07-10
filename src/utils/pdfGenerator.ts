import jsPDF from 'jspdf';
import { Order, Client } from '../types';

interface OrderItemWithDetails {
  itemId: string;
  quantity: number;
  price: number;
  name: string;
}

// Cache for loaded fonts (base64 TTF data)
const fontCache: { regular?: string; bold?: string } = {};

const FONT_REGULAR_URL =
  'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf';
const FONT_BOLD_URL =
  'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf';
const FONT_FAMILY = 'DejaVuSans';

// sfnt magic: TTF (0x00010000), OTF ('OTTO'), and Apple ('true').
function isValidTtf(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  const sig = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  return sig === '\x00\x01\x00\x00' || sig === 'OTTO' || sig === 'true';
}

async function loadFont(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Font fetch failed: ${response.status} for ${url}`);
  }
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (!isValidTtf(bytes)) {
    throw new Error(`Fetched data is not a valid TTF/OTF: ${url}`);
  }
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function ensureFonts(doc: jsPDF): Promise<void> {
  if (fontCache.regular && fontCache.bold) {
    doc.addFileToVFS(`${FONT_FAMILY}-Regular.ttf`, fontCache.regular);
    doc.addFont(`${FONT_FAMILY}-Regular.ttf`, FONT_FAMILY, 'normal');
    doc.addFileToVFS(`${FONT_FAMILY}-Bold.ttf`, fontCache.bold);
    doc.addFont(`${FONT_FAMILY}-Bold.ttf`, FONT_FAMILY, 'bold');
    return;
  }

  try {
    // DejaVu Sans fully covers Czech/Latin-Extended glyphs and ships real .ttf files.
    const [regularBase64, boldBase64] = await Promise.all([
      loadFont(FONT_REGULAR_URL),
      loadFont(FONT_BOLD_URL),
    ]);

    fontCache.regular = regularBase64;
    fontCache.bold = boldBase64;

    doc.addFileToVFS(`${FONT_FAMILY}-Regular.ttf`, regularBase64);
    doc.addFont(`${FONT_FAMILY}-Regular.ttf`, FONT_FAMILY, 'normal');
    doc.addFileToVFS(`${FONT_FAMILY}-Bold.ttf`, boldBase64);
    doc.addFont(`${FONT_FAMILY}-Bold.ttf`, FONT_FAMILY, 'bold');
  } catch (error) {
    console.warn('Failed to load DejaVu font, falling back to helvetica:', error);
    // Helvetica does not cover Czech diacritics, but avoids the widths/Unicode crash.
  }
}

export const generateOrderPDF = async (
  order: Order,
  client: Client,
  orderItems: OrderItemWithDetails[]
): Promise<void> => {
  const doc = new jsPDF();
  await ensureFonts(doc);

  // Check if the custom font loaded successfully; fall back to helvetica.
  const hasCustomFont = doc.getFontList()[FONT_FAMILY] !== undefined;
  const fontName = hasCustomFont ? FONT_FAMILY : 'helvetica';

  // Company Header
  doc.setFontSize(20);
  doc.setFont(fontName, 'bold');
  doc.text('DODACÍ LIST', 20, 30);

  // Order Info
  doc.setFontSize(12);
  doc.setFont(fontName, 'normal');
  doc.text('Sesamo Food s.r.o.', 20, 50);
  doc.text('Purkynova 3091/97  61200 Brno', 20, 60);
  doc.text('ICO:                       9075526', 20, 70);
  doc.text('DIC:                      CZ09075526', 20, 80);

  // Client Info
  doc.setFont(fontName, 'bold');
  doc.text('Dodací list pro:', 120, 50);
  doc.setFont(fontName, 'normal');
  doc.text(client.name, 120, 60);

  // Split address into lines
  const addressLines = client.address.split(',').map(line => line.trim());
  let yPos = 70;
  addressLines.forEach(line => {
    doc.text(line, 120, yPos);
    yPos += 10;
  });

  doc.text(`ICO: ${client.vat}`, 120, yPos);

  doc.text(`Datum vystavení: ${new Date(order.deliveryDate).toLocaleDateString()}`, 20, yPos + 20);

  // Items Table Header
  doc.setFontSize(10);
  const tableStartY = Math.max(yPos + 20, 110);
  doc.setFont(fontName, 'normal');
  doc.text('Popis položky', 20, tableStartY);
  doc.text('Množství', 85, tableStartY);
  doc.text('Cena za MJ', 105, tableStartY);
  doc.text('Celkem bez DPH', 125, tableStartY);
  doc.text('DPH', 155, tableStartY);
  doc.text('Celkem s DPH', 165, tableStartY);

  // Draw header line
  doc.line(20, tableStartY + 2, 190, tableStartY + 2);

  // Items
  doc.setFontSize(12);
  doc.setFont(fontName, 'normal');
  let currentY = tableStartY + 15;

  // Calculate order discount
  let orderTotalDB = 0;
  orderItems.forEach((item) => {
    orderTotalDB += item.price * item.quantity;
  });

  let discount = 1;
  if (orderTotalDB >= 1200) {
    discount = 0.8;
  } else if (orderTotalDB >= 600) {
    discount = 0.9;
  }

  orderItems.forEach((item) => {
    const itemTotal = item.price * item.quantity;

    doc.text(item.name, 20, currentY);
    doc.text(item.quantity.toString(), 90, currentY);

    const priceDph = item.price * discount * 0.88;
    const totalNoDph = itemTotal * discount * 0.88;
    const totalDph = itemTotal * discount;

    doc.text(`${priceDph.toFixed(2)}`, 110, currentY);
    doc.text(`${totalNoDph.toFixed(2)}`, 130, currentY);
    doc.text('12%', 155, currentY);
    doc.text(`${totalDph.toFixed(2)}`, 170, currentY);

    currentY += 8;

    // Add new page if needed
    if (currentY > 270) {
      doc.addPage();
      currentY = 30;
    }
  });

  // Total line
  doc.line(20, currentY + 5, 190, currentY + 5);
  doc.setFont(fontName, 'bold');

  const totalWithoutVat = orderTotalDB * discount * 0.88;
  const totalVat = orderTotalDB * discount * 0.12;
  const totalWithVat = orderTotalDB * discount;

  doc.text('Celkem bez DPH:', 90, currentY + 15);
  doc.text(`${totalWithoutVat.toFixed(2)} CZK`, 170, currentY + 15);

  doc.text('Celkem DPH:', 90, currentY + 25);
  doc.text(`${totalVat.toFixed(2)} CZK`, 170, currentY + 25);

  doc.text('Celkem s DPH:', 90, currentY + 35);
  doc.text(`${totalWithVat.toFixed(2)} CZK`, 170, currentY + 35);

  // Notes
  if (order.notes) {
    currentY += 50;
    doc.setFont(fontName, 'bold');
    doc.text('Poznámky:', 20, currentY);
    doc.setFont(fontName, 'normal');
    const notes = doc.splitTextToSize(order.notes, 170);
    doc.text(notes, 20, currentY + 10);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.setFont(fontName, 'normal');
  doc.text('https://sesamobrno.cz/', 20, pageHeight - 20);
  doc.text('Sesamo Obchodní <sesamosales@gmail.com>', 120, pageHeight - 20);

  // Save the PDF
  doc.save(`Dodaci_list-${new Date(order.deliveryDate).toLocaleDateString()}-${order.id.slice(-8)}-${client.name.replace(/\s+/g, '_')}.pdf`);
};
