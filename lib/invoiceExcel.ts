import ExcelJS from 'exceljs';
import { InvoiceData, computeTotals, lineTotal } from './types';
import { numberToWords } from './numberToWords';
import { SELLER } from './companyInfo';

/**
 * Builds an .xlsx invoice that replicates the exact reference template:
 * icon + "Dynemic Metals" wordmark (both cropped from the real letterhead),
 * "SALES TAX INVOICE" title, buyer/date/seller blocks,
 * item table (S.NO / DESCRIPTION / UNIT / QUANTITY / UNIT PRICE / WEIGHT KG / PRICE KG / TOTAL),
 * totals row, HS code, subtotal/tax/total box, amount in words.
 */
export async function buildInvoiceExcel(
  invoice: InvoiceData,
  logoIconBase64: string | null,
  logoWordmarkBase64: string | null
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Invoice', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });

  const widths = [12.86, 13, 13, 13, 13, 14.71, 15.71, 24.71, 13, 12.57, 20.14, 20.43, 16.71, 20, 24.57];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const THIN = { style: 'thin' as const };
  const allBorders = (cell: ExcelJS.Cell) => {
    cell.border = { top: THIN, bottom: THIN, left: THIN, right: THIN };
  };
  const centerWrap = (cell: ExcelJS.Cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  };
  const center = (cell: ExcelJS.Cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  };

  ws.getRow(1).height = 27.75;
  ws.getRow(2).height = 69;

  // Icon (small) — centered horizontally across the full invoice width, exact crop from real letterhead
  if (logoIconBase64) {
    try {
      const iconId = workbook.addImage({ base64: logoIconBase64, extension: 'png' });
      ws.addImage(iconId, { tl: { col: 6.7, row: 0.15 }, ext: { width: 58, height: 55 } });
    } catch {
      /* ignore */
    }
  }

  // Wordmark "Dynemic Metals" + website — centered next to the icon, exact crop from real letterhead
  if (logoWordmarkBase64) {
    try {
      const wordmarkId = workbook.addImage({ base64: logoWordmarkBase64, extension: 'png' });
      ws.addImage(wordmarkId, { tl: { col: 8, row: 0.2 }, ext: { width: 260, height: 63 } });
    } catch {
      /* ignore */
    }
  }

  ws.getRow(3).height = 15;
  ws.mergeCells('A3:D5');
  const titleCell = ws.getCell('A3');
  titleCell.value = 'SALES TAX INVOICE';
  titleCell.font = { name: 'Times New Roman', size: 20 };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.getRow(8).height = 24.95;

  ws.mergeCells('A10:E10');
  ws.getCell('A10').value = invoice.buyerName || '-';
  ws.getCell('A10').font = { name: 'Calibri', size: 14, bold: true };

  ws.mergeCells('A11:F12');
  ws.getCell('A11').value = invoice.buyerAddress || '-';
  ws.getCell('A11').font = { name: 'Calibri', size: 14 };
  ws.getCell('A11').alignment = { wrapText: true, vertical: 'top' };

  ws.mergeCells('A14:E14');
  ws.getCell('A14').value = invoice.buyerNtn ? `NTN#  ${invoice.buyerNtn}` : '';
  ws.getCell('A14').font = { name: 'Calibri', size: 14 };

  ws.mergeCells('A15:E15');
  ws.getCell('A15').value = invoice.buyerPo ? `PO# ${invoice.buyerPo}` : '';
  ws.getCell('A15').font = { name: 'Calibri', size: 14 };

  ws.mergeCells('H10:I10');
  ws.getCell('H10').value = 'INVOICE DATE:';
  ws.getCell('H10').font = { name: 'Calibri', size: 14 };

  ws.getRow(11).height = 24.95;
  ws.getCell('H11').value = invoice.invoiceDate || '';
  ws.getCell('H11').font = { name: 'Calibri', size: 16 };
  if (invoice.invoiceDate) {
    const d = new Date(invoice.invoiceDate);
    if (!isNaN(d.getTime())) {
      ws.getCell('H11').value = d;
      ws.getCell('H11').numFmt = 'm/d/yyyy';
    }
  }

  ws.mergeCells('H13:I13');
  ws.getCell('H13').value = 'DUE DATE:';
  ws.getCell('H13').font = { name: 'Calibri', size: 14 };
  if (invoice.dueDate) {
    const d = new Date(invoice.dueDate);
    if (!isNaN(d.getTime())) {
      ws.getCell('H14').value = d;
      ws.getCell('H14').numFmt = 'm/d/yyyy';
      ws.getCell('H14').font = { name: 'Calibri', size: 16 };
    }
  }

  ws.mergeCells('H16:I16');
  ws.getCell('H16').value = 'INVOICE NUMBER';
  ws.getCell('H16').font = { name: 'Calibri', size: 14 };

  ws.getCell('H17').value = invoice.invoiceNumber ? (Number(invoice.invoiceNumber) || invoice.invoiceNumber) : '';
  ws.getCell('H17').font = { name: 'Calibri', size: 16 };
  ws.getCell('H17').alignment = { horizontal: 'center' };

  ws.mergeCells('K9:O9');
  ws.getCell('K9').value = SELLER.name;
  ws.getCell('K9').font = { name: 'Calibri', size: 16, bold: true };

  ws.mergeCells('K10:O10');
  ws.getCell('K10').value = `${SELLER.addressLine1} `;
  ws.getCell('K10').font = { name: 'Calibri', size: 16 };
  ws.getCell('K10').alignment = { wrapText: true };

  ws.mergeCells('K11:O11');
  ws.getCell('K11').value = SELLER.addressLine2;
  ws.getCell('K11').font = { name: 'Calibri', size: 16 };

  ws.mergeCells('K12:O12');
  ws.getCell('K12').value = `PH: ${SELLER.phone}`;
  ws.getCell('K12').font = { name: 'Calibri', size: 16 };

  ws.mergeCells('K13:O13');
  ws.getCell('K13').value = `NTN # ${SELLER.ntn}`;
  ws.getCell('K13').font = { name: 'Calibri', size: 16 };

  ws.mergeCells('K14:O14');
  ws.getCell('K14').value = `GST # ${SELLER.gst}`;
  ws.getCell('K14').font = { name: 'Calibri', size: 16 };

  const headerRow = 19;
  ws.getRow(headerRow).height = 48.75;
  ws.mergeCells('B19:H19');
  ws.mergeCells('I19:J19');
  const headerCells: [string, string][] = [
    ['A19', 'S.NO'],
    ['B19', 'DESCRIPTION'],
    ['I19', 'UNIT'],
    ['K19', 'QUANTITY'],
    ['L19', 'UNIT PRICE'],
    ['M19', 'WEIGHT KG'],
    ['N19', 'PRICE KG'],
    ['O19', 'TOTAL']
  ];
  headerCells.forEach(([coord, val]) => {
    const cell = ws.getCell(coord);
    cell.value = val;
    cell.font = { name: 'Times New Roman', size: 18, bold: true };
    centerWrap(cell);
  });
  ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'].forEach(col => allBorders(ws.getCell(`${col}19`)));

  let row = 20;
  invoice.items.forEach((item, idx) => {
    ws.getRow(row).height = 50.1;
    ws.mergeCells(`B${row}:H${row}`);
    ws.mergeCells(`I${row}:J${row}`);

    const sno = ws.getCell(`A${row}`);
    sno.value = idx + 1;
    sno.font = { name: 'Calibri', size: 16 };
    center(sno);

    const desc = ws.getCell(`B${row}`);
    desc.value = item.description;
    desc.font = { name: 'Calibri', size: 16 };
    center(desc);

    const unit = ws.getCell(`I${row}`);
    unit.value = item.unit;
    unit.font = { name: 'Calibri', size: 16 };
    center(unit);

    const qty = ws.getCell(`K${row}`);
    qty.value = item.quantity;
    qty.font = { name: 'Calibri', size: 16 };
    qty.numFmt = '#,##0';
    center(qty);

    const uprice = ws.getCell(`L${row}`);
    uprice.value = item.unitPrice;
    uprice.font = { name: 'Calibri', size: 16 };
    uprice.numFmt = '#,##0.00';
    center(uprice);

    const wt = ws.getCell(`M${row}`);
    wt.value = item.weightKg;
    wt.font = { name: 'Calibri', size: 16 };
    wt.numFmt = '0.00';
    center(wt);

    const pkg = ws.getCell(`N${row}`);
    pkg.value = item.priceKg;
    pkg.font = { name: 'Calibri', size: 16 };
    pkg.numFmt = '0.00';
    center(pkg);

    const total = ws.getCell(`O${row}`);
    total.value = lineTotal(item);
    total.font = { name: 'Calibri', size: 16 };
    total.numFmt = '#,##0.00';
    center(total);

    ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'].forEach(col => allBorders(ws.getCell(`${col}${row}`)));

    row++;
  });

  const totalsRow = row;
  ws.mergeCells(`I${totalsRow}:J${totalsRow}`);
  ws.getCell(`I${totalsRow}`).value = 'TOTAL';
  ws.getCell(`I${totalsRow}`).font = { name: 'Calibri', size: 16 };
  center(ws.getCell(`I${totalsRow}`));

  const totalQty = invoice.items.reduce((s, i) => s + i.quantity, 0);
  const totalWeight = invoice.items.reduce((s, i) => s + i.weightKg, 0);

  ws.getCell(`K${totalsRow}`).value = totalQty;
  ws.getCell(`K${totalsRow}`).font = { name: 'Calibri', size: 16 };
  ws.getCell(`K${totalsRow}`).numFmt = '#,##0';
  center(ws.getCell(`K${totalsRow}`));

  ws.getCell(`L${totalsRow}`).value = 'TOTAL WEIGHT';
  ws.getCell(`L${totalsRow}`).font = { name: 'Calibri', size: 16 };
  center(ws.getCell(`L${totalsRow}`));

  ws.getCell(`M${totalsRow}`).value = totalWeight;
  ws.getCell(`M${totalsRow}`).font = { name: 'Calibri', size: 16 };
  ws.getCell(`M${totalsRow}`).numFmt = '0.00';
  center(ws.getCell(`M${totalsRow}`));

  row = totalsRow + 1;

  const hsRow = row;
  ws.mergeCells(`A${hsRow}:H${hsRow}`);
  ws.getCell(`A${hsRow}`).value = invoice.hsCode ? `HS CODE # ${invoice.hsCode}` : '';
  ws.getCell(`A${hsRow}`).font = { name: 'Times New Roman', size: 16 };
  center(ws.getCell(`A${hsRow}`));

  const { subtotal, tax, total } = computeTotals(invoice.items, invoice.taxRatePercent);

  const summaryLabel = (r: number, label: string) => {
    const cell = ws.getCell(`N${r}`);
    cell.value = label;
    cell.font = { name: 'Calibri', size: 16, bold: true };
    center(cell);
    allBorders(cell);
  };
  const summaryValue = (r: number, value: number) => {
    const cell = ws.getCell(`O${r}`);
    cell.value = value;
    cell.font = { name: 'Calibri', size: 16 };
    cell.numFmt = '#,##0.00';
    center(cell);
    allBorders(cell);
  };

  summaryLabel(hsRow, 'SUBTOTAL');
  summaryValue(hsRow, subtotal);
  summaryLabel(hsRow + 1, `SALES TAX (${invoice.taxRatePercent}%)`);
  summaryValue(hsRow + 1, tax);
  summaryLabel(hsRow + 2, 'TOTAL');
  summaryValue(hsRow + 2, total);

  row = hsRow + 3;

  ws.mergeCells(`A${row}:K${row}`);
  const wordsHeader = ws.getCell(`A${row}`);
  wordsHeader.value = 'TOTAL AMOUNT IN WORDS';
  wordsHeader.font = { name: 'Calibri', size: 16, bold: true };
  wordsHeader.alignment = { horizontal: 'left', vertical: 'middle' };
  row++;

  ws.mergeCells(`A${row}:K${row}`);
  const wordsCell = ws.getCell(`A${row}`);
  wordsCell.value = numberToWords(total);
  wordsCell.font = { name: 'Calibri', size: 18, underline: true, color: { argb: 'FF2244AA' } };
  wordsCell.alignment = { horizontal: 'left', vertical: 'middle' };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
