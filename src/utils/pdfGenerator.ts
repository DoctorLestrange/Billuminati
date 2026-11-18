import { jsPDF } from 'jspdf';
import { Invoice, PdfPageOptions } from '../types/billing';
import {
  amountToWords,
  calculateInvoiceSummary,
  formatBuyerDisplayName,
  formatPaymentMethodSummary,
  formatPdfCurrency,
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

  // Top Header Band
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(margin, y, contentWidth, 2, 'F');
  y += 8;

  const hasLogo = Boolean((opts.showSellerLogo ?? true) && invoice.seller.logoDataUrl);
  const logoSizeMm = 18;
  const sellerTextX = hasLogo ? margin + logoSizeMm + 4 : margin;
  const headerStartY = y;

  if (hasLogo && invoice.seller.logoDataUrl) {
    try {
      doc.addImage(
        invoice.seller.logoDataUrl,
        'PNG',
        margin,
        headerStartY - 4.5,
        logoSizeMm,
        logoSizeMm
      );
    } catch {
      // Fallback gracefully if custom image cannot be decoded by jsPDF
    }
  }

  // Seller Company Name & Document Title
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(15);
  doc.setTextColor(accent[0], accent[1], accent[2]);
  doc.text(invoice.seller.companyName || 'Tax Invoice', sellerTextX, y);

  doc.setFontSize(12.5);
  doc.text(
    (opts.headerTitle || 'TAX INVOICE').toUpperCase(),
    pageWidth - margin,
    y,
    { align: 'right' }
  );
  y += 5;

  // Seller sub-details left, Invoice metadata right
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(82, 82, 91);

  const sellerLines = [
    invoice.seller.addressLine1,
    invoice.seller.cityStatePostal,
    invoice.seller.country,
    invoice.seller.taxId ? `GSTIN: ${invoice.seller.taxId}` : '',
    [invoice.seller.email, invoice.seller.phone].filter(Boolean).join(' · '),
  ].filter(Boolean);

  const metaLines = [
    `Invoice No: ${invoice.invoiceNumber}`,
    `Invoice Date: ${invoice.issueDate}`,
    invoice.status !== 'Paid' && invoice.dueDate ? `Due Date: ${invoice.dueDate}` : '',
    `Status: ${invoice.status}`,
    invoice.purchaseOrderNumber && !invoice.isCashCustomer
      ? `PO Ref: ${invoice.purchaseOrderNumber}`
      : '',
    invoice.placeOfSupply ? `Place of Supply: ${invoice.placeOfSupply}` : '',
  ].filter(Boolean);

  const rowCount = Math.max(sellerLines.length, metaLines.length);
  for (let i = 0; i < rowCount; i++) {
    if (sellerLines[i]) {
      doc.setFont(PDF_FONT_FAMILY, 'normal');
      doc.setTextColor(82, 82, 91);
      doc.text(sellerLines[i], sellerTextX, y);
    }
    if (metaLines[i]) {
      doc.setFont(PDF_FONT_FAMILY, i === 0 ? 'bold' : 'normal');
      doc.setTextColor(i === 0 ? 24 : 82, i === 0 ? 24 : 82, i === 0 ? 27 : 91);
      doc.text(metaLines[i], pageWidth - margin, y, { align: 'right' });
      doc.setFont(PDF_FONT_FAMILY, 'normal');
      doc.setTextColor(82, 82, 91);
    }
    y += 4.3;
  }

  if (hasLogo) {
    y = Math.max(y, headerStartY + logoSizeMm - 2);
  }

  y += 3;
  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  // Bill To Section
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('BILLED TO (BUYER)', margin, y);
  doc.text('CONSIGNMENT & GST SUMMARY', margin + contentWidth * 0.58, y);
  y += 4.5;

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(24, 24, 27);
  doc.text(formatBuyerDisplayName(invoice), margin, y);

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(63, 63, 70);
  doc.text(
    `Total Line Items: ${invoice.items.length}   |   Total Quantity: ${summary.totalUnits}`,
    margin + contentWidth * 0.58,
    y
  );
  y += 4.3;

  const buyerLines = invoice.isCashCustomer
    ? []
    : [
        invoice.buyer.name && invoice.buyer.companyName
          ? `Attn: ${invoice.buyer.name}`
          : '',
        invoice.buyer.addressLine1,
        invoice.buyer.cityStatePostal,
        invoice.buyer.country,
        invoice.buyer.taxId ? `GSTIN: ${invoice.buyer.taxId}` : '',
        [invoice.buyer.email, invoice.buyer.phone].filter(Boolean).join(' · '),
      ].filter(Boolean);

  const taxModeLabel: Record<typeof taxMode, string> = {
    CGST_SGST: 'GST Supply Type: Intra-State (CGST + SGST)',
    IGST: 'GST Supply Type: Inter-State (IGST)',
    EXEMPT: 'GST Supply Type: Exempt / Nil Rated (0%)',
  };

  const rightSummaryLines = [
    taxModeLabel[taxMode],
    paymentSummary ? `Payment Method: ${paymentSummary}` : '',
    'Currency: Indian Rupees (INR)',
  ].filter(Boolean);

  const partyRows = Math.max(buyerLines.length, rightSummaryLines.length);
  for (let i = 0; i < partyRows; i++) {
    if (buyerLines[i]) {
      doc.text(buyerLines[i], margin, y);
    }
    if (rightSummaryLines[i]) {
      doc.text(rightSummaryLines[i], margin + contentWidth * 0.58, y);
    }
    y += 4.3;
  }

  y += 4;

  // Dynamic Table Columns
  interface ColDef {
    key: string;
    label: string;
    width: number;
    align: 'left' | 'right' | 'center';
  }

  const cols: ColDef[] = [
    { key: 'idx', label: '#', width: 7, align: 'left' },
    { key: 'item', label: 'Item Description', width: 42, align: 'left' },
  ];

  if (opts.showSkuColumn) {
    cols.push({ key: 'sku', label: 'HSN/SAC', width: 17, align: 'left' });
  }
  if (opts.showPackagingColumn) {
    cols.push({ key: 'pkg', label: 'Packaging', width: 18, align: 'left' });
  }
  cols.push(
    { key: 'qty', label: 'Qty', width: 11, align: 'right' },
    { key: 'rate', label: 'Rate (Excl)', width: 20, align: 'right' },
    { key: 'taxable', label: 'Taxable Val', width: 22, align: 'right' }
  );
  if (taxMode === 'CGST_SGST') {
    cols.push(
      { key: 'cgst', label: 'CGST', width: 16, align: 'right' },
      { key: 'sgst', label: 'SGST', width: 16, align: 'right' }
    );
  } else if (taxMode === 'IGST') {
    cols.push({ key: 'igst', label: 'IGST', width: 18, align: 'right' });
  }
  if (opts.showDiscountColumn) {
    cols.push({ key: 'disc', label: 'Discount', width: 16, align: 'right' });
  }
  cols.push({ key: 'total', label: 'Total (Incl)', width: 24, align: 'right' });

  // Normalize column widths to match contentWidth
  const rawTotalW = cols.reduce((acc, c) => acc + c.width, 0);
  const scale = contentWidth / rawTotalW;
  cols.forEach((c) => {
    c.width = c.width * scale;
  });

  // Table Header
  ensureSpace(14);
  doc.setFillColor(244, 244, 245);
  doc.rect(margin, y, contentWidth, 7.5, 'F');
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(39, 39, 42);

  let cx = margin;
  for (const col of cols) {
    const tx =
      col.align === 'right'
        ? cx + col.width - 1.5
        : col.align === 'center'
        ? cx + col.width / 2
        : cx + 1.5;
    doc.text(col.label, tx, y + 5, { align: col.align });
    cx += col.width;
  }
  y += 7.5;

  // Table Rows
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(7.8);

  invoice.items.forEach((item, idx) => {
    const lineCalc = summary.lines[item.id];
    const rowHeight = item.description ? 10 : 7.5;
    ensureSpace(rowHeight + 2);

    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    let rx = margin;
    const textY = y + 4.6;

    for (const col of cols) {
      const tx =
        col.align === 'right'
          ? rx + col.width - 1.5
          : col.align === 'center'
          ? rx + col.width / 2
          : rx + 1.5;

      doc.setTextColor(24, 24, 27);
      doc.setFont(PDF_FONT_FAMILY, 'normal');

      if (col.key === 'idx') {
        doc.text(String(idx + 1), tx, textY);
      } else if (col.key === 'item') {
        doc.setFont(PDF_FONT_FAMILY, 'bold');
        const mainTitle = doc.splitTextToSize(item.name || 'Item', col.width - 3)[0] || '';
        doc.text(mainTitle, tx, textY);
        if (item.description) {
          doc.setFont(PDF_FONT_FAMILY, 'normal');
          doc.setFontSize(6.8);
          doc.setTextColor(113, 113, 122);
          const subDesc =
            doc.splitTextToSize(item.description, col.width - 3)[0] || '';
          doc.text(subDesc, tx, textY + 3.6);
          doc.setFontSize(7.8);
        }
      } else if (col.key === 'sku') {
        doc.text(item.skuOrHsn || '-', tx, textY);
      } else if (col.key === 'pkg') {
        const clipped =
          doc.splitTextToSize(item.packagingType, col.width - 2)[0] ||
          item.packagingType;
        doc.text(clipped, tx, textY);
      } else if (col.key === 'qty') {
        doc.text(String(item.quantity), tx, textY, { align: 'right' });
      } else if (col.key === 'rate') {
        doc.text(formatPdfCurrency(lineCalc?.unitPriceExclusive || 0), tx, textY, {
          align: 'right',
        });
      } else if (col.key === 'taxable') {
        doc.text(formatPdfCurrency(lineCalc?.taxableAmount || 0), tx, textY, {
          align: 'right',
        });
      } else if (col.key === 'cgst') {
        doc.text(
          `${lineCalc?.effectiveCgstPercent || 0}% (${formatPdfCurrency(
            lineCalc?.cgstAmount || 0
          )})`,
          tx,
          textY,
          { align: 'right' }
        );
      } else if (col.key === 'sgst') {
        doc.text(
          `${lineCalc?.effectiveSgstPercent || 0}% (${formatPdfCurrency(
            lineCalc?.sgstAmount || 0
          )})`,
          tx,
          textY,
          { align: 'right' }
        );
      } else if (col.key === 'igst') {
        doc.text(
          `${lineCalc?.effectiveIgstPercent || 0}% (${formatPdfCurrency(
            lineCalc?.igstAmount || 0
          )})`,
          tx,
          textY,
          { align: 'right' }
        );
      } else if (col.key === 'disc') {
        const discVal = lineCalc?.preTaxDiscountAmount || 0;
        doc.text(
          discVal > 0 ? `-${formatPdfCurrency(discVal)}` : '-',
          tx,
          textY,
          { align: 'right' }
        );
      } else if (col.key === 'total') {
        doc.setFont(PDF_FONT_FAMILY, 'bold');
        doc.text(formatPdfCurrency(lineCalc?.totalLineAmount || 0), tx, textY, {
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

  y += 5;
  ensureSpace(45);

  // Bottom Split: Left (Amount in Words, GST Slab Breakdown, Bank Details) & Right (Totals Box)
  const leftWidth = contentWidth * 0.56;
  const rightX = margin + contentWidth * 0.6;
  let leftY = y;
  let rightY = y;

  if (opts.showAmountInWords) {
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(113, 113, 122);
    doc.text('AMOUNT IN WORDS (INR)', margin, leftY);
    leftY += 4;
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    const wordsLines = doc.splitTextToSize(
      amountToWords(summary.grandTotal),
      leftWidth
    );
    doc.text(wordsLines, margin, leftY);
    leftY += wordsLines.length * 4 + 3;
  }

  if (opts.showTaxBreakdown && taxMode !== 'EXEMPT' && summary.taxSlabBreakdown.length > 0) {
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(113, 113, 122);
    doc.text('GST SLAB BREAKDOWN', margin, leftY);
    leftY += 4;
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(63, 63, 70);

    for (const slab of summary.taxSlabBreakdown) {
      const lineStr =
        taxMode === 'CGST_SGST'
          ? `Taxable ${formatPdfCurrency(slab.taxableAmount)}: CGST @ ${
              slab.cgstRate
            }% (${formatPdfCurrency(slab.cgst)}) + SGST @ ${
              slab.sgstRate
            }% (${formatPdfCurrency(slab.sgst)})`
          : `Taxable ${formatPdfCurrency(slab.taxableAmount)}: IGST @ ${
              slab.igstRate
            }% (${formatPdfCurrency(slab.igst)})`;
      doc.text(lineStr, margin, leftY);
      leftY += 3.8;
    }
    leftY += 2;
  }

  if (opts.showBankDetails && invoice.bankDetails.bankName) {
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(113, 113, 122);
    doc.text('BANK & NEFT / RTGS DETAILS', margin, leftY);
    leftY += 4;
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(63, 63, 70);
    const bankLines = [
      `Bank: ${invoice.bankDetails.bankName}`,
      `Account Name: ${invoice.bankDetails.accountName}`,
      `A/C No: ${invoice.bankDetails.accountNumber}   |   IFSC: ${invoice.bankDetails.routingOrIfsc}`,
      invoice.bankDetails.swiftOrIban ? `UPI / Branch: ${invoice.bankDetails.swiftOrIban}` : '',
    ].filter(Boolean);
    for (const bl of bankLines) {
      doc.text(bl, margin, leftY);
      leftY += 3.8;
    }
  }

  // Right Column Totals Summary
  const drawSummaryRow = (label: string, val: string, isBold = false) => {
    doc.setFont(PDF_FONT_FAMILY, isBold ? 'bold' : 'normal');
    doc.setFontSize(isBold ? 9.5 : 8.5);
    doc.setTextColor(isBold ? 24 : 82, isBold ? 24 : 82, isBold ? 27 : 91);
    doc.text(label, rightX, rightY);
    doc.text(val, pageWidth - margin, rightY, { align: 'right' });
    rightY += isBold ? 5.5 : 4.4;
  };

  drawSummaryRow(
    'Subtotal:',
    formatPdfCurrency(summary.merchandiseSubtotal)
  );

  if (summary.itemPreTaxDiscountTotal > 0) {
    drawSummaryRow(
      'Line Item Discounts:',
      `-${formatPdfCurrency(summary.itemPreTaxDiscountTotal)}`
    );
  }
  if (summary.additionalPreTaxDiscountAmount > 0) {
    drawSummaryRow(
      'Additional Invoice Discount:',
      `-${formatPdfCurrency(summary.additionalPreTaxDiscountAmount)}`
    );
  }
  if (
    summary.itemPreTaxDiscountTotal > 0 ||
    summary.additionalPreTaxDiscountAmount > 0
  ) {
    drawSummaryRow(
      'Total Taxable Value:',
      formatPdfCurrency(summary.taxableSubtotal)
    );
  }

  if (taxMode === 'CGST_SGST') {
    drawSummaryRow('Total CGST:', formatPdfCurrency(summary.cgstTotal));
    drawSummaryRow('Total SGST:', formatPdfCurrency(summary.sgstTotal));
  } else if (taxMode === 'IGST') {
    drawSummaryRow('Total IGST:', formatPdfCurrency(summary.igstTotal));
  }

  if (invoice.roundOff && summary.roundOffAdjustment !== 0) {
    drawSummaryRow(
      'Round Off:',
      formatPdfCurrency(summary.roundOffAdjustment)
    );
  }

  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.4);
  doc.line(rightX, rightY - 2, pageWidth - margin, rightY - 2);
  rightY += 2;

  drawSummaryRow(
    'Grand Total (INR):',
    formatPdfCurrency(summary.grandTotal),
    true
  );

  y = Math.max(leftY, rightY) + 6;
  ensureSpace(24);

  // Notes, Terms & Signature Row
  if (invoice.notes || invoice.termsAndConditions) {
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(113, 113, 122);
    doc.text('DISPATCH NOTES & TERMS', margin, y);
    y += 4;
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(82, 82, 91);
    const combinedNotes = [invoice.notes, invoice.termsAndConditions]
      .filter(Boolean)
      .join(' | ');
    const wrappedNotes = doc.splitTextToSize(combinedNotes, contentWidth * 0.62);
    doc.text(wrappedNotes, margin, y);
  }

  if (opts.showSignatureBlock) {
    const sigX = pageWidth - margin - 45;
    doc.setDrawColor(161, 161, 170);
    doc.setLineWidth(0.3);
    doc.line(sigX, y + 10, pageWidth - margin, y + 10);
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(39, 39, 42);
    doc.text(
      opts.signatoryLabel || 'Authorized Signatory',
      pageWidth - margin,
      y + 14.5,
      { align: 'right' }
    );
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 113, 122);
    doc.text(`For ${invoice.seller.companyName}`, pageWidth - margin, y + 18.5, {
      align: 'right',
    });
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
