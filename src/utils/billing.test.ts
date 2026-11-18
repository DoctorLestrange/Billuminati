import test from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import {
  amountToWords,
  calculateInvoiceSummary,
  calculateLineItem,
  calculateLogoSquarePlacement,
  createCatalogItemFromInclusivePrice,
  filterAndSortInvoices,
  formatBuyerDisplayName,
  formatCurrency,
  formatPackagePlural,
  formatPaymentMethodSummary,
  formatTaxModeLabel,
  generateNextInvoiceNumber,
  getCatalogItemInclusivePrice,
  getItemNameTypography,
  normalizeInvoiceRecord,
  updateItemFromInclusiveRate,
  updateItemFromLineTotalInclusive,
  updateItemFromTaxableValue,
  updateItemTaxRates,
  validateAndParseBackupJson,
} from './billing';
import { PDF_FONT_FAMILY, registerIbmPlexSerif } from './ibmPlexSerifFont';
import { Invoice, InvoiceLineItem, PACKAGING_OPTIONS } from '../types/billing';

const sampleLine: InvoiceLineItem = {
  id: 'line-1',
  name: 'Industrial Sensor Array',
  skuOrHsn: '85423100',
  packagingType: 'Bucket',
  unitsPerPackage: 1,
  packageCount: 50,
  quantity: 50,
  priceEntryMode: 'EXCLUSIVE',
  unitPrice: 200, // 50 * 200 = 10,000 gross merchandise
  unitPriceInclusive: 236,
  discountAmount: 1180, // ₹1,180 discount on final value -> reduces pre-tax taxable to 9,000 and GST to 1,620 so final is 10,620
  taxPercent: 18, // 9% CGST + 9% SGST
  cgstPercent: 9,
  sgstPercent: 9,
  igstPercent: 18,
};

test('calculateLineItem calculates discount on final value (adjusting pre-tax taxable and GST so final amount changes as required) or directly on pre-tax base', () => {
  // Mode 1: calculateDiscountOnFinalValue = true (default)
  const finalMode = calculateLineItem(sampleLine, 'CGST_SGST', true);
  assert.equal(finalMode.grossMerchandiseAmount, 10000);
  assert.equal(finalMode.grossLineTotal, 11800);
  assert.equal(finalMode.discountAmount, 1180);
  assert.equal(finalMode.preTaxDiscountAmount, 1000);
  assert.equal(finalMode.taxableAmount, 9000);
  assert.equal(finalMode.cgstAmount, 810);
  assert.equal(finalMode.sgstAmount, 810);
  assert.equal(finalMode.igstAmount, 0);
  assert.equal(finalMode.taxAmount, 1620);
  assert.equal(finalMode.totalLineAmount, 10620); // 11800 - 1180 exact final reduction, and 9000 + 1620 = 10620

  // Mode 2: calculateDiscountOnFinalValue = false (direct pre-tax deduction)
  const baseMode = calculateLineItem({ ...sampleLine, discountAmount: 1000 }, 'CGST_SGST', false);
  assert.equal(baseMode.grossMerchandiseAmount, 10000);
  assert.equal(baseMode.preTaxDiscountAmount, 1000);
  assert.equal(baseMode.taxableAmount, 9000);
  assert.equal(baseMode.cgstAmount, 810);
  assert.equal(baseMode.sgstAmount, 810);
  assert.equal(baseMode.taxAmount, 1620);
  assert.equal(baseMode.totalLineAmount, 10620);
});

test('calculateLineItem computes IGST when taxMode is IGST and zero tax when EXEMPT', () => {
  const igstRes = calculateLineItem(sampleLine, 'IGST', true);
  assert.equal(igstRes.cgstAmount, 0);
  assert.equal(igstRes.sgstAmount, 0);
  assert.equal(igstRes.taxableAmount, 9000);
  assert.equal(igstRes.igstAmount, 1620);
  assert.equal(igstRes.discountAmount, 1180);
  assert.equal(igstRes.totalLineAmount, 10620);

  const exemptRes = calculateLineItem({ ...sampleLine, discountAmount: 800 }, 'EXEMPT', true);
  assert.equal(exemptRes.taxAmount, 0);
  assert.equal(exemptRes.grossLineTotal, 10000);
  assert.equal(exemptRes.discountAmount, 800);
  assert.equal(exemptRes.taxableAmount, 9200);
  assert.equal(exemptRes.totalLineAmount, 9200);
});

test('dynamic value entry: entering tax-inclusive unit rate back-calculates taxable value and GST accurately', () => {
  const baseItem: InvoiceLineItem = {
    ...sampleLine,
    packageCount: 10,
    unitsPerPackage: 1,
    quantity: 10,
    discountAmount: 0,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    taxPercent: 18,
  };

  // User enters ₹1,180 inclusive of 18% GST per unit
  const updated = updateItemFromInclusiveRate(baseItem, 1180, 'CGST_SGST');
  assert.equal(updated.unitPrice, 1000);
  assert.equal(updated.unitPriceInclusive, 1180);

  const calc = calculateLineItem(updated, 'CGST_SGST');
  assert.equal(calc.taxableAmount, 10000);
  assert.equal(calc.cgstAmount, 900);
  assert.equal(calc.sgstAmount, 900);
  assert.equal(calc.totalLineAmount, 11800);
});

test('dynamic value entry: entering taxable value or line total inclusive back-calculates unit prices with pre-tax / final-value discount', () => {
  const baseItem: InvoiceLineItem = {
    ...sampleLine,
    packageCount: 5,
    unitsPerPackage: 1,
    quantity: 5,
    discountAmount: 590, // ₹590 discount on final value (which is ₹500 pre-tax at 18% GST)
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    taxPercent: 18,
  };

  // User directly types ₹4,500 as the Taxable Value for 5 units (with ₹590 final discount -> ₹500 pre-tax discount -> ₹5,000 gross merchandise)
  const fromTaxable = updateItemFromTaxableValue(baseItem, 4500, 'CGST_SGST', true);
  assert.equal(fromTaxable.unitPrice, 1000);
  assert.equal(fromTaxable.unitPriceInclusive, 1180);
  const calc1 = calculateLineItem(fromTaxable, 'CGST_SGST', true);
  assert.equal(calc1.taxableAmount, 4500);
  assert.equal(calc1.grossLineTotal, 5900);
  assert.equal(calc1.totalLineAmount, 5310); // 5900 - 590 discount = 5310 (4500 taxable + 810 GST)

  // User directly types ₹11,210 as the Line Total (after ₹590 final discount -> ₹11,800 gross incl 18% GST)
  const fromTotal = updateItemFromLineTotalInclusive(baseItem, 11210, 'IGST', true);
  const calc2 = calculateLineItem(fromTotal, 'IGST', true);
  assert.equal(calc2.taxableAmount, 9500);
  assert.equal(calc2.igstAmount, 1710);
  assert.equal(calc2.discountAmount, 590);
  assert.equal(calc2.totalLineAmount, 11210);
  assert.equal(fromTotal.unitPrice, 2000);
});

test('updateItemTaxRates updates CGST, SGST, and IGST and preserves inclusive anchor when in INCLUSIVE mode', () => {
  const itemIncl = updateItemFromInclusiveRate(
    {
      ...sampleLine,
      quantity: 1,
      discountAmount: 0,
    },
    1180,
    'CGST_SGST'
  );
  // Change CGST to 6% and SGST to 6% (12% total GST) while anchored to ₹1,120 inclusive
  const with12 = updateItemTaxRates(
    { ...itemIncl, unitPriceInclusive: 1120 },
    { cgstPercent: 6, sgstPercent: 6 },
    'CGST_SGST'
  );
  assert.equal(with12.taxPercent, 12);
  assert.equal(with12.unitPrice, 1000);
});

test('calculateLogoSquarePlacement expands non-square logos to square preserving aspect ratio and downscales to 512px', () => {
  // Wide 1024x512 logo (2:1 aspect ratio)
  const wide = calculateLogoSquarePlacement(1024, 512, 512);
  assert.equal(wide.canvasSize, 512);
  assert.equal(wide.sourceSquareSize, 1024);
  assert.equal(wide.sourceOffsetX, 0);
  assert.equal(wide.sourceOffsetY, 256);
  assert.equal(wide.drawWidth, 512);
  assert.equal(wide.drawHeight, 256);
  assert.equal(wide.offsetX, 0);
  assert.equal(wide.offsetY, 128);

  // Tall 300x600 logo (1:2 aspect ratio)
  const tall = calculateLogoSquarePlacement(300, 600, 512);
  assert.equal(tall.canvasSize, 512);
  assert.equal(tall.sourceSquareSize, 600);
  assert.equal(tall.sourceOffsetX, 150);
  assert.equal(tall.sourceOffsetY, 0);
  assert.equal(tall.drawWidth, 256);
  assert.equal(tall.drawHeight, 512);
  assert.equal(tall.offsetX, 128);
  assert.equal(tall.offsetY, 0);
});

test('PACKAGING_OPTIONS includes Bucket, Tin, Bottle and other industrial packaging items, and IBM Plex Serif registers in jsPDF', () => {
  assert.ok(PACKAGING_OPTIONS.includes('Bucket'));
  assert.ok(PACKAGING_OPTIONS.includes('Tin'));
  assert.ok(PACKAGING_OPTIONS.includes('Bottle'));
  assert.ok(PACKAGING_OPTIONS.includes('Drum'));
  assert.ok(PACKAGING_OPTIONS.includes('Jar'));
  assert.ok(PACKAGING_OPTIONS.includes('Can'));

  assert.equal(formatPackagePlural('Bucket', 3), 'Buckets');
  assert.equal(formatPackagePlural('Tin', 2), 'Tins');
  assert.equal(formatPackagePlural('Bottle', 5), 'Bottles');
  assert.equal(formatPackagePlural('Pouch', 4), 'Pouches');

  const doc = new jsPDF();
  registerIbmPlexSerif(doc);
  assert.equal(doc.getFont().fontName, PDF_FONT_FAMILY);
});

const makeSampleInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-1',
  invoiceNumber: 'INV-2026-0101',
  issueDate: '2026-11-15',
  dueDate: '2026-11-30',
  status: 'Pending',
  currency: 'INR',
  taxMode: 'CGST_SGST',
  placeOfSupply: '27 - Maharashtra',
  purchaseOrderNumber: 'PO-9901',
  isCashCustomer: false,
  paymentMethod: '',
  paymentMethodOther: '',
  paymentMethodDetails: '',
  calculateDiscountOnFinalValue: true,
  seller: {
    name: 'Rajesh Sharma',
    companyName: 'Bharat Precision Components Pvt. Ltd.',
    taxId: '27AABCB9603R1ZM',
    email: 'billing@bharatprecision.in',
    phone: '+91 98201 44210',
    addressLine1: 'Plot 42, MIDC Industrial Area, Andheri East',
    cityStatePostal: 'Mumbai, Maharashtra 400093',
    country: 'India',
  },
  buyer: {
    name: 'Vikramaditya Nair',
    companyName: 'Deccan Automation Systems LLP',
    taxId: '27AADCD4491K1Z2',
    email: 'accounts@deccanautomation.in',
    phone: '+91 98450 19002',
    addressLine1: 'Hinjawadi Phase 2, Rajiv Gandhi Infotech Park',
    cityStatePostal: 'Pune, Maharashtra 411057',
    country: 'India',
  },
  bankDetails: {
    bankName: 'HDFC Bank Ltd.',
    accountName: 'Bharat Precision Components Pvt. Ltd.',
    accountNumber: '50200049281940',
    routingOrIfsc: 'HDFC0000240',
  },
  items: [sampleLine],
  shippingAndHandling: 0,
  additionalDiscountAmount: 1180,
  roundOff: true,
  notes: 'Handle with care.',
  termsAndConditions: '',
  pdfOptions: {
    paperSize: 'a4',
    orientation: 'portrait',
    marginPreset: 'standard',
    accentColor: 'slate',
    headerTitle: 'TAX INVOICE',
    showSellerLogo: true,
    showSkuColumn: true,
    showPackagingColumn: true,
    showDiscountColumn: true,
    showTaxBreakdown: true,
    showAmountInWords: true,
    showBankDetails: true,
    showSignatureBlock: true,
    signatoryLabel: 'Authorized Signatory',
    footerNote: 'Thank you for your business.',
  },
  createdAt: '2026-11-15T10:00:00Z',
  updatedAt: '2026-11-15T10:00:00Z',
  ...overrides,
});

test('calculateInvoiceSummary always calculates both line and additional discounts on final value and exposes taxable discount amounts', () => {
  // sampleLine has grossMerchandise = 10,000, line discount = 1,180 (on final value -> 1,000 taxable discount, 9,000 taxable, 1,620 GST, 10,620 line total)
  // additionalDiscountAmount = 1,180 (on final value -> 1,000 taxable discount, reduces taxable to 8,000, GST to 1,440, so final is 9,440)
  const inv = makeSampleInvoice();
  const summary = calculateInvoiceSummary(inv);
  assert.equal(summary.totalUnits, 50);
  assert.equal(summary.merchandiseSubtotal, 10000);
  assert.equal(summary.itemDiscountTotal, 1180);
  assert.equal(summary.itemPreTaxDiscountTotal, 1000);
  assert.equal(summary.lineTaxableSubtotal, 9000); // Subtotal with line item discounts deducted (matches sum of table Taxable Val)
  assert.equal(summary.additionalDiscountAmount, 1180);
  assert.equal(summary.additionalPreTaxDiscountAmount, 1000);
  assert.equal(summary.taxableSubtotal, 8000); // 9,000 - 1,000 additional pre-tax discount
  assert.equal(summary.cgstTotal, 720);
  assert.equal(summary.sgstTotal, 720);
  assert.equal(summary.totalTax, 1440);
  assert.equal(summary.shippingAndHandling, 0);
  assert.equal(summary.rawGrandTotal, 9440); // 11,800 - 1,180 - 1,180 = 9,440 (and 8,000 + 1,440 = 9,440)
  assert.equal(summary.grandTotal, 9440);
});

test('Cash Customer option, Payment Method/Date formatting, Paid dueDate clearing, and Pending/Overdue payment clearing work accurately', () => {
  const cashInv = normalizeInvoiceRecord(
    makeSampleInvoice({
      status: 'Paid',
      dueDate: '2026-12-01',
      isCashCustomer: true,
      paymentMethod: 'Other',
      paymentMethodOther: 'NEFT Escrow',
      paymentDate: '2026-11-16',
      paymentMethodDetails: 'Ref #99102',
    })
  );

  // Paid status clears dueDate and preserves payment fields
  assert.equal(cashInv.dueDate, '');
  assert.equal(cashInv.paymentDate, '2026-11-16');
  // Cash Customer overrides buyer display name
  assert.equal(formatBuyerDisplayName(cashInv), 'Cash Customer');
  // Payment method summary formats custom Other method + details + paymentDate
  assert.equal(
    formatPaymentMethodSummary(cashInv),
    'NEFT Escrow (Ref #99102) · Paid on 2026-11-16'
  );

  // Pending or Overdue status clears paymentMethod, paymentMethodOther, paymentDate, and paymentMethodDetails
  const pendingInv = normalizeInvoiceRecord(
    makeSampleInvoice({
      status: 'Pending',
      paymentMethod: 'UPI',
      paymentMethodOther: 'Custom',
      paymentDate: '2026-11-16',
      paymentMethodDetails: 'UTR 12345',
    })
  );
  assert.equal(pendingInv.paymentMethod, '');
  assert.equal(pendingInv.paymentMethodOther, '');
  assert.equal(pendingInv.paymentDate, '');
  assert.equal(pendingInv.paymentMethodDetails, '');
  assert.equal(formatPaymentMethodSummary(pendingInv), '');

  const overdueInv = normalizeInvoiceRecord(
    makeSampleInvoice({
      status: 'Overdue',
      paymentMethod: 'Cash',
      paymentDate: '2026-11-10',
      paymentMethodDetails: 'Receipt #55',
    })
  );
  assert.equal(overdueInv.paymentMethod, '');
  assert.equal(overdueInv.paymentDate, '');
  assert.equal(overdueInv.paymentMethodDetails, '');
  assert.equal(formatPaymentMethodSummary(overdueInv), '');
});

test('createCatalogItemFromInclusivePrice and getCatalogItemInclusivePrice store tax-inclusive unit price and tax rate', () => {
  const item18 = createCatalogItemFromInclusivePrice({
    id: 'cat-test-18',
    name: 'Dielectric Coolant Bucket',
    skuOrHsn: '27101980',
    packagingType: 'Bucket',
    unitPriceInclusive: 1180,
    taxPercent: 18,
  });
  assert.equal(item18.unitPriceInclusive, 1180);
  assert.equal(item18.taxPercent, 18);
  assert.equal(item18.unitPrice, 1000);
  assert.equal(getCatalogItemInclusivePrice(item18), 1180);

  const item12 = createCatalogItemFromInclusivePrice({
    id: 'cat-test-12',
    name: 'Calibration Bottle',
    skuOrHsn: '38140010',
    packagingType: 'Bottle',
    unitPriceInclusive: 560,
    taxPercent: 12,
  });
  assert.equal(item12.unitPriceInclusive, 560);
  assert.equal(item12.taxPercent, 12);
  assert.equal(item12.unitPrice, 500);
  assert.equal(getCatalogItemInclusivePrice(item12), 560);
});

test('amountToWords and formatCurrency use Indian Rupee Lakh/Crore numbering', () => {
  assert.equal(
    amountToWords(124500.5),
    'One Lakh Twenty Four Thousand Five Hundred Rupees and Fifty Paise Only'
  );
  assert.equal(amountToWords(0), 'Zero Rupees Only');
  assert.match(formatCurrency(124500), /^₹1,24,500\.00$/);
});

test('generateNextInvoiceNumber and filterAndSortInvoices work accurately', () => {
  const inv1 = makeSampleInvoice({
    id: '1',
    invoiceNumber: 'INV-2026-0104',
    issueDate: '2026-11-17',
    status: 'Paid',
  });
  const inv2 = makeSampleInvoice({
    id: '2',
    invoiceNumber: 'INV-2026-0109',
    issueDate: '2026-10-01',
    status: 'Overdue',
    buyer: { ...inv1.buyer, companyName: 'Kaveri Switchgear Pvt Ltd' },
  });

  assert.match(generateNextInvoiceNumber([inv1, inv2]), /-0110$/);

  const bySearch = filterAndSortInvoices(
    [inv1, inv2],
    {
      searchQuery: 'kaveri',
      status: 'All',
      datePreset: 'all',
      dateFrom: '',
      dateTo: '',
      sortBy: 'dateDesc',
    },
    '2026-11-17'
  );
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, '2');
});

test('validateAndParseBackupJson supports full backup objects, raw arrays, single invoices, and catalog normalization', () => {
  const inv = makeSampleInvoice({ status: 'Paid', dueDate: '2026-12-10' });
  const fullBackupJson = JSON.stringify({
    version: 2,
    app: 'Billuminati',
    invoices: [inv],
    defaultTermsAndConditions: 'Subject to Mumbai Jurisdiction.',
    catalog: [
      {
        id: 'cat-legacy',
        name: 'Industrial Tin Pack',
        skuOrHsn: '32089090',
        packagingType: 'Tin',
        unitPriceInclusive: 1180,
        taxPercent: 18,
      },
    ],
  });

  const parsedFull = validateAndParseBackupJson(fullBackupJson);
  assert.equal(parsedFull.valid, true);
  assert.equal(parsedFull.invoices?.length, 1);
  // Paid invoice due date is automatically normalized to empty string
  assert.equal(parsedFull.invoices?.[0].dueDate, '');
  assert.equal(
    parsedFull.backup?.defaultTermsAndConditions,
    'Subject to Mumbai Jurisdiction.'
  );
  assert.equal(parsedFull.backup?.catalog?.[0].unitPrice, 1000);
  assert.equal(parsedFull.backup?.catalog?.[0].unitPriceInclusive, 1180);

  // Also supports importing a single invoice JSON object directly
  const singleInvParsed = validateAndParseBackupJson(JSON.stringify(inv));
  assert.equal(singleInvParsed.valid, true);
  assert.equal(singleInvParsed.invoices?.length, 1);

  // Rejects invalid JSON cleanly
  const invalidParsed = validateAndParseBackupJson('{ bad json');
  assert.equal(invalidParsed.valid, false);

  assert.equal(formatPackagePlural('Box', 3), 'Boxes');
  assert.equal(formatTaxModeLabel('CGST_SGST'), 'CGST + SGST');
  assert.equal(formatTaxModeLabel('IGST'), 'IGST');
});

test('getItemNameTypography scales font size down and preserves multi-line wrapping for long item names', () => {
  const shortTypo = getItemNameTypography('Hex Bolt M8');
  assert.equal(shortTypo.isLong, false);
  assert.equal(shortTypo.pdfFontSizePt, 7.8);

  const medTypo = getItemNameTypography(
    'Anodized Aluminum Enclosure (IP67 Marine Rated)'
  );
  assert.equal(medTypo.isLong, true);
  assert.equal(medTypo.isVeryLong, false);
  assert.equal(medTypo.pdfFontSizePt, 6.9);

  const veryLongName =
    'Ultra-High-Purity Anhydrous Optical Sensor Calibration Solvent & Dielectric Cleaning Reagent (Industrial Grade 500ml)';
  const longTypo = getItemNameTypography(veryLongName);
  assert.equal(longTypo.isLong, true);
  assert.equal(longTypo.isVeryLong, true);
  assert.equal(longTypo.pdfFontSizePt, 6.4);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  registerIbmPlexSerif(doc);
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(longTypo.pdfFontSizePt);
  const lines: string[] = doc.splitTextToSize(veryLongName, 40);
  assert.ok(lines.length >= 2);
  assert.ok(lines.join(' ').includes('Industrial Grade 500ml'));
});

test('initial defaults start completely clean with no sample bills, fake company, or catalog items', async () => {
  const {
    DEFAULT_SELLER,
    DEFAULT_BANK,
    DEFAULT_PDF_OPTIONS,
    DEFAULT_TERMS_AND_CONDITIONS,
    INITIAL_CATALOG,
    INITIAL_INVOICES,
  } = await import('../data/seedData');

  assert.equal(INITIAL_INVOICES.length, 0);
  assert.equal(INITIAL_CATALOG.length, 0);
  assert.equal(DEFAULT_SELLER.companyName, '');
  assert.equal(DEFAULT_SELLER.name, '');
  assert.equal(DEFAULT_SELLER.taxId, '');
  assert.equal(DEFAULT_SELLER.email, '');
  assert.equal(DEFAULT_SELLER.phone, '');
  assert.equal(DEFAULT_SELLER.addressLine1, '');
  assert.equal(DEFAULT_SELLER.cityStatePostal, '');
  assert.equal(DEFAULT_BANK.bankName, '');
  assert.equal(DEFAULT_BANK.accountName, '');
  assert.equal(DEFAULT_BANK.accountNumber, '');
  assert.equal(DEFAULT_BANK.routingOrIfsc, '');
  assert.equal(DEFAULT_PDF_OPTIONS.footerNote, '');
  assert.equal(DEFAULT_TERMS_AND_CONDITIONS, '');
});


