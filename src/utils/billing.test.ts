import test from 'node:test';
import assert from 'node:assert/strict';
import {
  amountToWords,
  calculateInvoiceSummary,
  calculateLineItem,
  filterAndSortInvoices,
  formatCurrency,
  formatPackagePlural,
  formatTaxModeLabel,
  generateNextInvoiceNumber,
  updateItemFromInclusiveRate,
  updateItemFromLineTotalInclusive,
  updateItemFromTaxableValue,
  updateItemTaxRates,
  validateAndParseBackupJson,
} from './billing';
import { Invoice, InvoiceLineItem } from '../types/billing';

const sampleLine: InvoiceLineItem = {
  id: 'line-1',
  name: 'Industrial Sensor Array',
  skuOrHsn: '85423100',
  packagingType: 'Box',
  unitsPerPackage: 10,
  packageCount: 5,
  quantity: 50,
  priceEntryMode: 'EXCLUSIVE',
  unitPrice: 200, // 50 * 200 = 10,000 merchandise
  unitPriceInclusive: 236,
  packagingCostPerPkg: 40, // 5 * 40 = 200 packaging -> 10,200 gross
  discountPercent: 10, // 10% of 10,200 = 1,020 -> 9,180 taxable
  taxPercent: 18, // 9% CGST + 9% SGST = 1,652.40 (826.20 + 826.20)
  cgstPercent: 9,
  sgstPercent: 9,
  igstPercent: 18,
};

test('calculateLineItem computes merchandise, packaging, discount, and CGST + SGST split accurately', () => {
  const result = calculateLineItem(sampleLine, 'CGST_SGST');
  assert.equal(result.grossMerchandiseAmount, 10000);
  assert.equal(result.packagingAmount, 200);
  assert.equal(result.grossBeforeDiscount, 10200);
  assert.equal(result.discountAmount, 1020);
  assert.equal(result.taxableAmount, 9180);
  assert.equal(result.cgstAmount, 826.2);
  assert.equal(result.sgstAmount, 826.2);
  assert.equal(result.igstAmount, 0);
  assert.equal(result.taxAmount, 1652.4);
  assert.equal(result.totalLineAmount, 10832.4);
});

test('calculateLineItem computes IGST when taxMode is IGST and zero when EXEMPT', () => {
  const igstRes = calculateLineItem(sampleLine, 'IGST');
  assert.equal(igstRes.cgstAmount, 0);
  assert.equal(igstRes.sgstAmount, 0);
  assert.equal(igstRes.igstAmount, 1652.4);
  assert.equal(igstRes.totalLineAmount, 10832.4);

  const exemptRes = calculateLineItem(sampleLine, 'EXEMPT');
  assert.equal(exemptRes.taxAmount, 0);
  assert.equal(exemptRes.totalLineAmount, 9180);
});

test('dynamic value entry: entering tax-inclusive unit rate back-calculates taxable value and GST accurately', () => {
  const baseItem: InvoiceLineItem = {
    ...sampleLine,
    packageCount: 1,
    unitsPerPackage: 10,
    quantity: 10,
    packagingCostPerPkg: 0,
    discountPercent: 0,
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

test('dynamic value entry: entering taxable value or line total inclusive back-calculates unit prices and GST', () => {
  const baseItem: InvoiceLineItem = {
    ...sampleLine,
    packageCount: 1,
    unitsPerPackage: 5,
    quantity: 5,
    packagingCostPerPkg: 0,
    discountPercent: 0,
    cgstPercent: 9,
    sgstPercent: 9,
    igstPercent: 18,
    taxPercent: 18,
  };

  // User directly types ₹5,000 as the Taxable Value for 5 units
  const fromTaxable = updateItemFromTaxableValue(baseItem, 5000, 'CGST_SGST');
  assert.equal(fromTaxable.unitPrice, 1000);
  assert.equal(fromTaxable.unitPriceInclusive, 1180);
  const calc1 = calculateLineItem(fromTaxable, 'CGST_SGST');
  assert.equal(calc1.taxableAmount, 5000);
  assert.equal(calc1.totalLineAmount, 5900);

  // User directly types ₹11,800 as the Line Total (Incl. 18% GST) for 5 units
  const fromTotal = updateItemFromLineTotalInclusive(baseItem, 11800, 'IGST');
  const calc2 = calculateLineItem(fromTotal, 'IGST');
  assert.equal(calc2.taxableAmount, 10000);
  assert.equal(calc2.igstAmount, 1800);
  assert.equal(calc2.totalLineAmount, 11800);
  assert.equal(fromTotal.unitPrice, 2000);
});

test('updateItemTaxRates updates CGST, SGST, and IGST and preserves inclusive anchor when in INCLUSIVE mode', () => {
  const itemIncl = updateItemFromInclusiveRate(
    {
      ...sampleLine,
      quantity: 1,
      packagingCostPerPkg: 0,
      discountPercent: 0,
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
  shippingAndHandling: 250,
  additionalDiscountAmount: 180,
  roundOff: true,
  notes: 'Handle with care.',
  termsAndConditions: 'Net 15 days.',
  pdfOptions: {
    paperSize: 'a4',
    orientation: 'portrait',
    marginPreset: 'standard',
    accentColor: 'slate',
    headerTitle: 'TAX INVOICE',
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

test('calculateInvoiceSummary aggregates totals, shipping, extra discount, and roundOff in INR', () => {
  const inv = makeSampleInvoice();
  const summary = calculateInvoiceSummary(inv);
  assert.equal(summary.totalPackages, 5);
  assert.equal(summary.totalUnits, 50);
  assert.equal(summary.merchandiseSubtotal, 10000);
  assert.equal(summary.packagingSubtotal, 200);
  assert.equal(summary.taxableSubtotal, 9000); // 9180 - 180 additional discount
  assert.equal(summary.totalTax, 1652.4);
  assert.equal(summary.rawGrandTotal, 10902.4); // 9000 + 1652.4 + 250 shipping
  assert.equal(summary.grandTotal, 10902); // rounded
  assert.equal(summary.roundOffAdjustment, -0.4);
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

test('validateAndParseBackupJson and format helpers work cleanly', () => {
  const inv = makeSampleInvoice();
  const validJson = JSON.stringify({
    version: 2,
    app: 'Billuminati',
    invoices: [inv],
  });

  const parsed = validateAndParseBackupJson(validJson);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.invoices?.length, 1);
  assert.equal(formatPackagePlural('Box', 3), 'Boxes');
  assert.equal(formatTaxModeLabel('CGST_SGST'), 'CGST + SGST');
  assert.equal(formatTaxModeLabel('IGST'), 'IGST');
});
