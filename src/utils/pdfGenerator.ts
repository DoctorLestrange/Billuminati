import { jsPDF } from 'jspdf';
import { Invoice, PdfPageOptions } from '../types/billing';
import {
  amountToWords,
  calculateInvoiceSummary,
  formatBuyerDisplayName,
  formatCurrency,
  formatPaymentMethodSummary,
  getItemNameTypography,
  normalizeTaxMode,
} from './billing';
import { PDF_FONT_FAMILY, registerIbmPlexSerif } from './ibmPlexSerifFont';

const ACCENT_RGB: Record<PdfPageOptions['accentColor'], [number, number, number]> = {
  slate: [24, 24, 27],
  indigo: [55, 48, 163],
  emerald: [6, 95, 70],
  amber: [146, 64, 14],
  crimson: [153, 27, 27],
};

const MARGIN_MM: Record<PdfPageOptions['marginPreset'], number> = {
  compact: 10,
  standard: 15,
  wide: 22,
};

export function exportInvoiceToPdf(
  invoice: Invoice,
  overrideOptions?: PdfPageOptions
): string {
  const opts: PdfPageOptions = overrideOptions || invoice.pdfOptions;
  const taxMode = normalizeTaxMode(invoice.taxMode);
  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'mm',
    format: opts.paperSize,
  });

  // Register and strictly enforce IBM Plex Serif across the entire PDF document
  registerIbmPlexSerif(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = MARGIN_MM[opts.marginPreset] || 15;
  const contentWidth = pageWidth - margin * 2;
  const accent = ACCENT_RGB[opts.accentColor] || ACCENT_RGB.slate;
  const summary = calculateInvoiceSummary(invoice);
  const paymentSummary = formatPaymentMethodSummary(invoice);

  let y = margin;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - margin - 12) {
      doc.addPage(opts.paperSize, opts.orientation);
      doc.setFont(PDF_FONT_FAMILY, 'normal');
      y = margin;
    }
  };

  // 1. Top Accent Bar (matches h-1.5 w-full mb-6 in PdfPreviewModal)
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(margin, y, contentWidth, 1.8, 'F');
  y += 7.5;

  // 2. Header Row: Left (Logo + Seller Details) & Right (Document Title + Invoice Metadata)
  const hasLogo = Boolean((opts.showSellerLogo ?? true) && invoice.seller.logoDataUrl);
  const logoSizeMm = 16;
  const sellerTextX = hasLogo ? margin + logoSizeMm + 4 : margin;
  const headerStartY = y;

  if (hasLogo && invoice.seller.logoDataUrl) {
    try {
      doc.addImage(
        invoice.seller.logoDataUrl,
        'PNG',
        margin,
        headerStartY - 4,
        logoSizeMm,
        logoSizeMm
      );
    } catch {
      // Fallback gracefully if custom image cannot be decoded by jsPDF
    }
  }

  // Seller Company Name (Left) & Document Title (Right)
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text(invoice.seller.companyName || 'Seller Company', sellerTextX, y);

  doc.setFontSize(11.5);
  doc.text(
    (opts.headerTitle || 'TAX INVOICE').toUpperCase(),
    pageWidth - margin,
    y,
    { align: 'right' }
  );
  y += 5;

  interface StyledLine {
    text: string;
    bold?: boolean;
    size?: number;
    color?: [number, number, number];
  }

  const sellerLines: StyledLine[] = [];
  if (invoice.seller.addressLine1) {
    sellerLines.push({ text: invoice.seller.addressLine1 });
  }
  if (invoice.seller.cityStatePostal) {
    sellerLines.push({ text: invoice.seller.cityStatePostal });
  }
  if (invoice.seller.taxId) {
    sellerLines.push({
      text: `GSTIN: ${invoice.seller.taxId}`,
      bold: true,
      size: 8,
      color: [39, 39, 42],
    });
  }
  const sellerContact = [invoice.seller.email, invoice.seller.phone]
    .filter(Boolean)
    .join(' · ');
  if (sellerContact) {
    sellerLines.push({ text: sellerContact });
  }

  const metaLines: StyledLine[] = [
    { text: invoice.invoiceNumber, bold: true, color: [24, 24, 27] },
    { text: `Invoice Date: ${invoice.issueDate}` },
  ];
  if (invoice.status === 'Paid' && invoice.paymentDate) {
    metaLines.push({ text: `Payment Date: ${invoice.paymentDate}` });
  }
  if (invoice.status !== 'Paid' && invoice.dueDate) {
    metaLines.push({ text: `Due Date: ${invoice.dueDate}` });
  }
  if (invoice.purchaseOrderNumber && !invoice.isCashCustomer) {
    metaLines.push({ text: `PO Ref: ${invoice.purchaseOrderNumber}` });
  }
  if (invoice.placeOfSupply) {
    metaLines.push({ text: `Place of Supply: ${invoice.placeOfSupply}` });
  }

  const headerRows = Math.max(sellerLines.length, metaLines.length);
  for (let i = 0; i < headerRows; i++) {
    const sLine = sellerLines[i];
    if (sLine) {
      doc.setFont(PDF_FONT_FAMILY, sLine.bold ? 'bold' : 'normal');
      doc.setFontSize(sLine.size || 8.3);
      const c = sLine.color || [82, 82, 91];
      doc.setTextColor(c[0], c[1], c[2]);
      doc.text(sLine.text, sellerTextX, y);
    }

    const mLine = metaLines[i];
    if (mLine) {
      doc.setFont(PDF_FONT_FAMILY, mLine.bold ? 'bold' : 'normal');
      doc.setFontSize(mLine.size || 8.3);
      const c = mLine.color || [82, 82, 91];
      doc.setTextColor(c[0], c[1], c[2]);
      doc.text(mLine.text, pageWidth - margin, y, { align: 'right' });
    }
    y += 4.1;
  }

  if (hasLogo) {
    y = Math.max(y, headerStartY + logoSizeMm - 2);
  }

  // Bottom border of Header Row
  y += 2.5;
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.25);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // 3. Parties & Consignment Overview (2 equal columns with vertical divider line in middle)
  const partySectionTopY = y - 1.5;
  const midX = margin + contentWidth * 0.5;
  const rightColX = midX + 6;
  const rightColWidth = contentWidth * 0.5 - 6;

  // Section Headings
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(161, 161, 170);
  doc.text('BILLED TO (BUYER)', margin, y);
  doc.text('CONSIGNMENT & GST SUMMARY', rightColX, y);
  y += 4.5;

  let leftPartyY = y;
  let rightPartyY = y;

  // Left: Buyer Name & Details
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text(formatBuyerDisplayName(invoice), margin, leftPartyY);
  leftPartyY += 4.3;

  if (!invoice.isCashCustomer) {
    const buyerLines: StyledLine[] = [];
    if (invoice.buyer.name && invoice.buyer.companyName) {
      buyerLines.push({ text: `Attn: ${invoice.buyer.name}` });
    }
    if (invoice.buyer.addressLine1) {
      buyerLines.push({ text: invoice.buyer.addressLine1 });
    }
    if (invoice.buyer.cityStatePostal) {
      buyerLines.push({ text: invoice.buyer.cityStatePostal });
    }
    if (invoice.buyer.taxId) {
      buyerLines.push({
        text: `GSTIN: ${invoice.buyer.taxId}`,
        bold: true,
        size: 8,
        color: [39, 39, 42],
      });
    }

    for (const bLine of buyerLines) {
      doc.setFont(PDF_FONT_FAMILY, bLine.bold ? 'bold' : 'normal');
      doc.setFontSize(bLine.size || 8.3);
      const c = bLine.color || [82, 82, 91];
      doc.setTextColor(c[0], c[1], c[2]);
      doc.text(bLine.text, margin, leftPartyY);
      leftPartyY += 4.1;
    }
  }

  // Right: Consignment & GST Summary 2-column grid matching PdfPreviewModal
  const drawLabelAndBoldValue = (
    x: number,
    currY: number,
    label: string,
    value: string
  ) => {
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(8.3);
    doc.setTextColor(113, 113, 122);
    doc.text(label, x, currY);
    const labelW = doc.getTextWidth(label);
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setTextColor(39, 39, 42);
    doc.text(value, x + labelW, currY);
  };

  const subCol2X = rightColX + rightColWidth * 0.5;
  drawLabelAndBoldValue(
    rightColX,
    rightPartyY,
    'Line Items: ',
    String(invoice.items.length)
  );
  drawLabelAndBoldValue(
    subCol2X,
    rightPartyY,
    'Total Qty: ',
    String(summary.totalUnits)
  );
  rightPartyY += 4.6;

  const gstRegimeText =
    taxMode === 'CGST_SGST'
      ? 'CGST + SGST'
      : taxMode === 'IGST'
      ? 'IGST'
      : 'Exempt';
  drawLabelAndBoldValue(rightColX, rightPartyY, 'GST Regime: ', gstRegimeText);
  drawLabelAndBoldValue(
    subCol2X,
    rightPartyY,
    'Payment Status: ',
    invoice.status
  );
  rightPartyY += 4.6;

  if (paymentSummary) {
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(8.3);
    doc.setTextColor(113, 113, 122);
    const pmLabel = 'Payment Method: ';
    doc.text(pmLabel, rightColX, rightPartyY);
    const pmLabelW = doc.getTextWidth(pmLabel);

    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setTextColor(39, 39, 42);
    const wrappedPm: string[] = doc.splitTextToSize(
      paymentSummary,
      Math.max(30, rightColWidth - pmLabelW)
    );
    wrappedPm.forEach((line, idx) => {
      doc.text(
        line,
        idx === 0 ? rightColX + pmLabelW : rightColX,
        rightPartyY + idx * 3.9
      );
    });
    rightPartyY += wrappedPm.length * 3.9 + 0.5;
  }

  y = Math.max(leftPartyY, rightPartyY) + 1.5;

  // Vertical divider line between Billed To and Consignment Summary
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.25);
  doc.line(midX, partySectionTopY, midX, y - 1);

  // Bottom border of Parties & Consignment Section
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // 4. Line Items Table
  interface ColDef {
    key: string;
    label: string;
    width: number;
    align: 'left' | 'right' | 'center';
  }

  const cols: ColDef[] = [
    { key: 'idx', label: '#', width: 7, align: 'left' },
    { key: 'item', label: 'Item Description', width: 44, align: 'left' },
  ];

  if (opts.showSkuColumn) {
    cols.push({ key: 'sku', label: 'HSN/SAC', width: 17, align: 'left' });
  }
  if (opts.showPackagingColumn) {
    cols.push({ key: 'pkg', label: 'Packaging', width: 17, align: 'left' });
  }
  cols.push(
    { key: 'qty', label: 'Qty', width: 10, align: 'right' },
    { key: 'rate', label: 'Rate (Excl)', width: 21, align: 'right' }
  );
  if (opts.showDiscountColumn) {
    cols.push({ key: 'disc', label: 'Discount', width: 17, align: 'right' });
  }
  cols.push({ key: 'taxable', label: 'Taxable Val', width: 22, align: 'right' });
  if (taxMode === 'CGST_SGST') {
    cols.push(
      { key: 'cgst', label: 'CGST', width: 16, align: 'right' },
      { key: 'sgst', label: 'SGST', width: 16, align: 'right' }
    );
  } else if (taxMode === 'IGST') {
    cols.push({ key: 'igst', label: 'IGST', width: 18, align: 'right' });
  }
  cols.push({ key: 'total', label: 'Total (Incl)', width: 23, align: 'right' });

  // Normalize column widths to match contentWidth
  const rawTotalW = cols.reduce((acc, c) => acc + c.width, 0);
  const scale = contentWidth / rawTotalW;
  cols.forEach((c) => {
    c.width = c.width * scale;
  });

  const itemCol = cols.find((c) => c.key === 'item')!;

  const drawTableHeader = () => {
    doc.setFillColor(244, 244, 245);
    doc.rect(margin, y, contentWidth, 7.5, 'F');
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.25);
    doc.line(margin, y, pageWidth - margin, y);
    doc.line(margin, y + 7.5, pageWidth - margin, y + 7.5);

    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(63, 63, 70);

    let cx = margin;
    for (const col of cols) {
      const tx =
        col.align === 'right'
          ? cx + col.width - 1.5
          : col.align === 'center'
          ? cx + col.width / 2
          : cx + 1.5;
      doc.text(col.label, tx, y + 4.9, { align: col.align });
      cx += col.width;
    }
    y += 7.5;
  };

  ensureSpace(16);
  drawTableHeader();

  // Table Rows with dynamic multi-line wrapping & font-size scaling for long item names
  invoice.items.forEach((item, idx) => {
    const lineCalc = summary.lines[item.id];
    const maxItemTextWidth = Math.max(15, itemCol.width - 3);
    const rawName = (item.name || 'Item').trim();
    const typo = getItemNameTypography(rawName);

    let nameFontSize = typo.pdfFontSizePt;
    let nameLineStep = typo.pdfLineHeightMm;

    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(nameFontSize);
    let titleLines: string[] = doc.splitTextToSize(rawName, maxItemTextWidth);

    // If the item name wraps to multiple lines even at 7.8pt, step down the font size
    // so it fits comfortably in smaller font across multiple lines without crowding
    if (titleLines.length > 1 && nameFontSize > 6.9) {
      nameFontSize = 6.9;
      nameLineStep = 3.3;
      doc.setFontSize(nameFontSize);
      titleLines = doc.splitTextToSize(rawName, maxItemTextWidth);
    }
    if (titleLines.length > 2 && nameFontSize > 6.4) {
      nameFontSize = 6.4;
      nameLineStep = 3.0;
      doc.setFontSize(nameFontSize);
      titleLines = doc.splitTextToSize(rawName, maxItemTextWidth);
    }

    let descLines: string[] = [];
    const descLineStep = 2.9;
    if (item.description && item.description.trim()) {
      doc.setFont(PDF_FONT_FAMILY, 'normal');
      doc.setFontSize(6.3);
      descLines = doc.splitTextToSize(item.description.trim(), maxItemTextWidth);
    }

    const itemContentHeight =
      titleLines.length * nameLineStep +
      (descLines.length > 0 ? descLines.length * descLineStep + 0.8 : 0) +
      3.8;
    const rowHeight = Math.max(10.5, itemContentHeight);

    if (y + rowHeight > pageHeight - margin - 12) {
      doc.addPage(opts.paperSize, opts.orientation);
      y = margin;
      drawTableHeader();
    }

    let rx = margin;
    const textY = y + 4.3;

    for (const col of cols) {
      const tx =
        col.align === 'right'
          ? rx + col.width - 1.5
          : col.align === 'center'
          ? rx + col.width / 2
          : rx + 1.5;

      doc.setTextColor(24, 24, 27);
      doc.setFont(PDF_FONT_FAMILY, 'normal');
      doc.setFontSize(7.6);

      if (col.key === 'idx') {
        doc.setTextColor(113, 113, 122);
        doc.text(String(idx + 1), tx, textY);
      } else if (col.key === 'item') {
        doc.setFont(PDF_FONT_FAMILY, 'bold');
        doc.setFontSize(nameFontSize);
        doc.setTextColor(24, 24, 27);
        titleLines.forEach((tLine, lineIdx) => {
          doc.text(tLine, tx, textY + lineIdx * nameLineStep);
        });

        if (descLines.length > 0) {
          doc.setFont(PDF_FONT_FAMILY, 'normal');
          doc.setFontSize(6.3);
          doc.setTextColor(113, 113, 122);
          const descStartY = textY + titleLines.length * nameLineStep + 0.4;
          descLines.forEach((dLine, dIdx) => {
            doc.text(dLine, tx, descStartY + dIdx * descLineStep);
          });
        }
      } else if (col.key === 'sku') {
        doc.setTextColor(82, 82, 91);
        doc.text(item.skuOrHsn || '—', tx, textY);
      } else if (col.key === 'pkg') {
        doc.setTextColor(82, 82, 91);
        const clipped =
          doc.splitTextToSize(item.packagingType, col.width - 2)[0] ||
          item.packagingType;
        doc.text(clipped, tx, textY);
      } else if (col.key === 'qty') {
        doc.text(String(item.quantity), tx, textY, { align: 'right' });
      } else if (col.key === 'rate') {
        doc.text(formatCurrency(lineCalc?.unitPriceExclusive || 0), tx, textY, {
          align: 'right',
        });
        doc.setFontSize(6.3);
        doc.setTextColor(161, 161, 170);
        doc.text(
          `Incl: ${formatCurrency(lineCalc?.unitPriceInclusive || 0)}`,
          tx,
          textY + 3.4,
          { align: 'right' }
        );
      } else if (col.key === 'disc') {
        doc.setTextColor(82, 82, 91);
        const discVal = lineCalc?.preTaxDiscountAmount || 0;
        doc.text(
          discVal > 0 ? `-${formatCurrency(discVal)}` : '—',
          tx,
          textY,
          { align: 'right' }
        );
      } else if (col.key === 'taxable') {
        doc.setFont(PDF_FONT_FAMILY, 'bold');
        doc.setTextColor(39, 39, 42);
        doc.text(formatCurrency(lineCalc?.taxableAmount || 0), tx, textY, {
          align: 'right',
        });
      } else if (col.key === 'cgst') {
        doc.setTextColor(82, 82, 91);
        doc.text(formatCurrency(lineCalc?.cgstAmount || 0), tx, textY, {
          align: 'right',
        });
        doc.setFontSize(6.3);
        doc.setTextColor(161, 161, 170);
        doc.text(`@${lineCalc?.effectiveCgstPercent || 0}%`, tx, textY + 3.4, {
          align: 'right',
        });
      } else if (col.key === 'sgst') {
        doc.setTextColor(82, 82, 91);
        doc.text(formatCurrency(lineCalc?.sgstAmount || 0), tx, textY, {
          align: 'right',
        });
        doc.setFontSize(6.3);
        doc.setTextColor(161, 161, 170);
        doc.text(`@${lineCalc?.effectiveSgstPercent || 0}%`, tx, textY + 3.4, {
          align: 'right',
        });
      } else if (col.key === 'igst') {
        doc.setTextColor(82, 82, 91);
        doc.text(formatCurrency(lineCalc?.igstAmount || 0), tx, textY, {
          align: 'right',
        });
        doc.setFontSize(6.3);
        doc.setTextColor(161, 161, 170);
        doc.text(`@${lineCalc?.effectiveIgstPercent || 0}%`, tx, textY + 3.4, {
          align: 'right',
        });
      } else if (col.key === 'total') {
        doc.setFont(PDF_FONT_FAMILY, 'bold');
        doc.setTextColor(24, 24, 27);
        doc.text(formatCurrency(lineCalc?.totalLineAmount || 0), tx, textY, {
          align: 'right',
        });
      }

      rx += col.width;
    }

    y += rowHeight;
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
  });

  // 5. Lower Summary & Breakdown (matches mt-6 pt-4 border-t border-zinc-200 in PdfPreviewModal)
  y += 5;
  ensureSpace(48);

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.25);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  const leftWidth = contentWidth * 0.55;
  const rightX = margin + contentWidth * 0.58;
  let leftY = y;
  let rightY = y;

  if (opts.showAmountInWords) {
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    doc.text('AMOUNT IN WORDS (INR)', margin, leftY);
    leftY += 4;
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(8.4);
    doc.setTextColor(39, 39, 42);
    const wordsLines = doc.splitTextToSize(
      amountToWords(summary.grandTotal),
      leftWidth
    );
    doc.text(wordsLines, margin, leftY);
    leftY += wordsLines.length * 4 + 3;
  }

  if (opts.showTaxBreakdown && taxMode !== 'EXEMPT' && summary.taxSlabBreakdown.length > 0) {
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    doc.text('GST SLAB SUMMARY', margin, leftY);
    leftY += 4;
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(82, 82, 91);

    for (const slab of summary.taxSlabBreakdown) {
      const lineStr =
        taxMode === 'CGST_SGST'
          ? `Taxable ${formatCurrency(slab.taxableAmount)}: CGST @${
              slab.cgstRate
            }% (${formatCurrency(slab.cgst)}) + SGST @${
              slab.sgstRate
            }% (${formatCurrency(slab.sgst)})`
          : `Taxable ${formatCurrency(slab.taxableAmount)}: IGST @${
              slab.igstRate
            }% (${formatCurrency(slab.igst)})`;
      doc.text(lineStr, margin, leftY);
      leftY += 3.9;
    }
    leftY += 2.5;
  }

  if (opts.showBankDetails && invoice.bankDetails.bankName) {
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    doc.text('BANK & NEFT / RTGS REMITTANCE', margin, leftY);
    leftY += 4;

    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(39, 39, 42);
    const bankHeaderLine = `${invoice.bankDetails.bankName} — ${invoice.bankDetails.accountName}`;
    const wrappedBankHeader = doc.splitTextToSize(bankHeaderLine, leftWidth);
    doc.text(wrappedBankHeader, margin, leftY);
    leftY += wrappedBankHeader.length * 3.9;

    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(82, 82, 91);
    doc.text(
      `A/C No: ${invoice.bankDetails.accountNumber} · IFSC: ${invoice.bankDetails.routingOrIfsc}`,
      margin,
      leftY
    );
    leftY += 4;
  }

  // Right Column Totals Summary (matches PdfPreviewModal Totals Column 1-to-1)
  const drawSummaryRow = (
    label: string,
    val: string,
    style: 'normal' | 'semibold' | 'grand' = 'normal'
  ) => {
    const isBold = style === 'semibold' || style === 'grand';
    doc.setFont(PDF_FONT_FAMILY, isBold ? 'bold' : 'normal');
    doc.setFontSize(style === 'grand' ? 9.8 : 8.4);
    if (style === 'grand') {
      doc.setTextColor(24, 24, 27);
    } else if (style === 'semibold') {
      doc.setTextColor(39, 39, 42);
    } else {
      doc.setTextColor(82, 82, 91);
    }
    doc.text(label, rightX, rightY);
    doc.text(val, pageWidth - margin, rightY, { align: 'right' });
    rightY += style === 'grand' ? 5.5 : 4.6;
  };

  drawSummaryRow(
    'Subtotal',
    formatCurrency(summary.lineTaxableSubtotal),
    'semibold'
  );

  if (summary.additionalPreTaxDiscountAmount > 0) {
    drawSummaryRow(
      'Additional Invoice Discount',
      `-${formatCurrency(summary.additionalPreTaxDiscountAmount)}`,
      'normal'
    );
    doc.setDrawColor(228, 228, 231);
    doc.setLineWidth(0.25);
    doc.line(rightX, rightY - 2.6, pageWidth - margin, rightY - 2.6);
    rightY += 1.2;
    drawSummaryRow(
      'Total Taxable Value',
      formatCurrency(summary.taxableSubtotal),
      'semibold'
    );
  }

  if (taxMode === 'CGST_SGST') {
    drawSummaryRow('Total CGST', formatCurrency(summary.cgstTotal), 'normal');
    drawSummaryRow('Total SGST', formatCurrency(summary.sgstTotal), 'normal');
  } else if (taxMode === 'IGST') {
    drawSummaryRow('Total IGST', formatCurrency(summary.igstTotal), 'normal');
  }

  if (invoice.roundOff && summary.roundOffAdjustment !== 0) {
    drawSummaryRow(
      'Round Off',
      formatCurrency(summary.roundOffAdjustment),
      'normal'
    );
  }

  // Thick accent border above Grand Total
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.5);
  doc.line(rightX, rightY - 2.2, pageWidth - margin, rightY - 2.2);
  rightY += 2.2;

  drawSummaryRow(
    'Grand Total',
    formatCurrency(summary.grandTotal),
    'grand'
  );

  // 6. Notes, Terms & Signature Footer (matches mt-8 pt-4 border-t border-zinc-200 in PdfPreviewModal)
  y = Math.max(leftY, rightY) + 5;
  ensureSpace(26);

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.25);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  const footerStartY = y;
  let notesY = footerStartY;
  const maxNotesW = contentWidth * 0.58;

  const drawBoldPrefixParagraph = (prefix: string, body: string) => {
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(63, 63, 70);
    doc.text(prefix, margin, notesY);
    const prefixW = doc.getTextWidth(prefix);

    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setTextColor(82, 82, 91);
    const lines: string[] = doc.splitTextToSize(body, maxNotesW - prefixW);
    lines.forEach((ln, idx) => {
      doc.text(ln, idx === 0 ? margin + prefixW : margin, notesY + idx * 3.8);
    });
    notesY += lines.length * 3.8 + 1.5;
  };

  if (invoice.notes) {
    drawBoldPrefixParagraph('Notes: ', invoice.notes);
  }
  if (invoice.termsAndConditions) {
    drawBoldPrefixParagraph('Terms: ', invoice.termsAndConditions);
  }

  if (opts.showSignatureBlock) {
    const sigX = pageWidth - margin - 45;
    const sigLineY = Math.max(footerStartY + 8, notesY - 2);
    doc.setDrawColor(161, 161, 170);
    doc.setLineWidth(0.3);
    doc.line(sigX, sigLineY, pageWidth - margin, sigLineY);
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(8.3);
    doc.setTextColor(39, 39, 42);
    doc.text(
      opts.signatoryLabel || 'Authorized Signatory',
      pageWidth - margin,
      sigLineY + 4.5,
      { align: 'right' }
    );
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(7.6);
    doc.setTextColor(113, 113, 122);
    doc.text(
      `For ${invoice.seller.companyName}`,
      pageWidth - margin,
      sigLineY + 8.5,
      { align: 'right' }
    );
  }

  // Footer Note
  if (opts.footerNote) {
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(161, 161, 170);
    doc.text(opts.footerNote, pageWidth / 2, pageHeight - margin / 2, {
      align: 'center',
    });
  }

  const safeFilename = `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(safeFilename);
  return safeFilename;
}
