import {
  BilluminatiBackup,
  DashboardFilters,
  Invoice,
  InvoiceLineItem,
  TaxMode,
} from '../types/billing';

export interface LineCalculation {
  unitPriceExclusive: number;
  unitPriceInclusive: number;
  grossMerchandiseAmount: number;
  packagingAmount: number;
  grossBeforeDiscount: number;
  discountAmount: number;
  taxableAmount: number;
  effectiveCgstPercent: number;
  effectiveSgstPercent: number;
  effectiveIgstPercent: number;
  effectiveTaxPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  totalLineAmount: number;
}

export interface InvoiceSummaryCalculation {
  lines: Record<string, LineCalculation>;
  totalPackages: number;
  totalUnits: number;
  merchandiseSubtotal: number;
  packagingSubtotal: number;
  itemDiscountTotal: number;
  additionalDiscountAmount: number;
  taxableSubtotal: number;
  totalTax: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  shippingAndHandling: number;
  rawGrandTotal: number;
  roundOffAdjustment: number;
  grandTotal: number;
  taxSlabBreakdown: Array<{
    rate: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  }>;
}

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function normalizeTaxMode(mode: string | undefined): TaxMode {
  if (!mode) return 'CGST_SGST';
  if (mode === 'CGST_SGST' || mode === 'GST_SPLIT') return 'CGST_SGST';
  if (mode === 'IGST') return 'IGST';
  if (mode === 'EXEMPT' || mode === 'NONE') return 'EXEMPT';
  return 'CGST_SGST';
}

export function getEffectiveLineTaxRates(
  item: InvoiceLineItem,
  rawTaxMode: TaxMode
): {
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  totalTaxPercent: number;
} {
  const taxMode = normalizeTaxMode(rawTaxMode);
  if (taxMode === 'EXEMPT') {
    return {
      cgstPercent: 0,
      sgstPercent: 0,
      igstPercent: 0,
      totalTaxPercent: 0,
    };
  }

  const baseTax = Math.min(100, Math.max(0, Number(item.taxPercent) || 0));

  if (taxMode === 'CGST_SGST') {
    const cgst =
      item.cgstPercent !== undefined && Number.isFinite(Number(item.cgstPercent))
        ? Math.min(100, Math.max(0, Number(item.cgstPercent)))
        : roundCurrency(baseTax / 2);
    const sgst =
      item.sgstPercent !== undefined && Number.isFinite(Number(item.sgstPercent))
        ? Math.min(100, Math.max(0, Number(item.sgstPercent)))
        : roundCurrency(baseTax - cgst);
    const total = roundCurrency(cgst + sgst);
    return {
      cgstPercent: cgst,
      sgstPercent: sgst,
      igstPercent: 0,
      totalTaxPercent: total,
    };
  }

  // IGST
  const igst =
    item.igstPercent !== undefined && Number.isFinite(Number(item.igstPercent))
      ? Math.min(100, Math.max(0, Number(item.igstPercent)))
      : baseTax;
  return {
    cgstPercent: 0,
    sgstPercent: 0,
    igstPercent: igst,
    totalTaxPercent: igst,
  };
}

export function calculateLineItem(
  item: InvoiceLineItem,
  rawTaxMode: TaxMode
): LineCalculation {
  const taxMode = normalizeTaxMode(rawTaxMode);
  const qty = Math.max(0, Number(item.quantity) || 0);
  const pkgCount = Math.max(0, Number(item.packageCount) || 0);
  const pkgCost = Math.max(0, Number(item.packagingCostPerPkg) || 0);
  const discountPct = Math.min(100, Math.max(0, Number(item.discountPercent) || 0));

  const {
    cgstPercent: effectiveCgstPercent,
    sgstPercent: effectiveSgstPercent,
    igstPercent: effectiveIgstPercent,
    totalTaxPercent: effectiveTaxPercent,
  } = getEffectiveLineTaxRates(item, taxMode);

  const taxMultiplier = 1 + effectiveTaxPercent / 100;

  let unitPriceExclusive = Math.max(0, Number(item.unitPrice) || 0);
  let unitPriceInclusive =
    item.unitPriceInclusive !== undefined && Number.isFinite(Number(item.unitPriceInclusive))
      ? Math.max(0, Number(item.unitPriceInclusive))
      : roundCurrency(unitPriceExclusive * taxMultiplier);

  if (item.priceEntryMode === 'INCLUSIVE' && item.unitPriceInclusive !== undefined) {
    unitPriceInclusive = Math.max(0, Number(item.unitPriceInclusive) || 0);
    unitPriceExclusive = roundRate(unitPriceInclusive / taxMultiplier);
  } else {
    unitPriceInclusive = roundCurrency(unitPriceExclusive * taxMultiplier);
  }

  const grossMerchandiseAmount = roundCurrency(qty * unitPriceExclusive);
  const packagingAmount = roundCurrency(pkgCount * pkgCost);
  const grossBeforeDiscount = roundCurrency(grossMerchandiseAmount + packagingAmount);
  const discountAmount = roundCurrency(grossBeforeDiscount * (discountPct / 100));
  const taxableAmount = roundCurrency(Math.max(0, grossBeforeDiscount - discountAmount));

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (taxMode === 'CGST_SGST') {
    cgstAmount = roundCurrency(taxableAmount * (effectiveCgstPercent / 100));
    sgstAmount = roundCurrency(taxableAmount * (effectiveSgstPercent / 100));
  } else if (taxMode === 'IGST') {
    igstAmount = roundCurrency(taxableAmount * (effectiveIgstPercent / 100));
  }

  const taxAmount = roundCurrency(cgstAmount + sgstAmount + igstAmount);
  const totalLineAmount = roundCurrency(taxableAmount + taxAmount);

  return {
    unitPriceExclusive: roundCurrency(unitPriceExclusive),
    unitPriceInclusive,
    grossMerchandiseAmount,
    packagingAmount,
    grossBeforeDiscount,
    discountAmount,
    taxableAmount,
    effectiveCgstPercent,
    effectiveSgstPercent,
    effectiveIgstPercent,
    effectiveTaxPercent,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxAmount,
    totalLineAmount,
  };
}

/**
 * Dynamic Value Entering Helpers:
 * Allow users to enter Unit Price (Excl. GST), Unit Price (Incl. GST),
 * Taxable Value (₹), or Total Amount (Incl. GST ₹), and automatically
 * compute all related fields.
 */
export function updateItemFromExclusiveRate(
  item: InvoiceLineItem,
  newExclusiveRate: number,
  taxMode: TaxMode
): InvoiceLineItem {
  const safeExcl = Math.max(0, Number(newExclusiveRate) || 0);
  const { totalTaxPercent } = getEffectiveLineTaxRates(item, taxMode);
  const incl = roundCurrency(safeExcl * (1 + totalTaxPercent / 100));
  return {
    ...item,
    priceEntryMode: 'EXCLUSIVE',
    unitPrice: safeExcl,
    unitPriceInclusive: incl,
  };
}

export function updateItemFromInclusiveRate(
  item: InvoiceLineItem,
  newInclusiveRate: number,
  taxMode: TaxMode
): InvoiceLineItem {
  const safeIncl = Math.max(0, Number(newInclusiveRate) || 0);
  const { totalTaxPercent } = getEffectiveLineTaxRates(item, taxMode);
  const excl = roundRate(safeIncl / (1 + totalTaxPercent / 100));
  return {
    ...item,
    priceEntryMode: 'INCLUSIVE',
    unitPrice: excl,
    unitPriceInclusive: safeIncl,
  };
}

export function updateItemFromTaxableValue(
  item: InvoiceLineItem,
  targetTaxableValue: number,
  taxMode: TaxMode
): InvoiceLineItem {
  const safeTaxable = Math.max(0, Number(targetTaxableValue) || 0);
  const qty = Math.max(1, Number(item.quantity) || 1);
  const pkgCount = Math.max(0, Number(item.packageCount) || 0);
  const pkgCost = Math.max(0, Number(item.packagingCostPerPkg) || 0);
  const discountPct = Math.min(99.99, Math.max(0, Number(item.discountPercent) || 0));

  const discountFactor = 1 - discountPct / 100;
  const requiredGrossBeforeDiscount = safeTaxable / discountFactor;
  const packagingAmount = pkgCount * pkgCost;
  const requiredMerchandise = Math.max(0, requiredGrossBeforeDiscount - packagingAmount);
  const newExclUnitPrice = roundRate(requiredMerchandise / qty);
  const { totalTaxPercent } = getEffectiveLineTaxRates(item, taxMode);
  const newInclUnitPrice = roundCurrency(newExclUnitPrice * (1 + totalTaxPercent / 100));

  return {
    ...item,
    priceEntryMode: 'EXCLUSIVE',
    unitPrice: newExclUnitPrice,
    unitPriceInclusive: newInclUnitPrice,
  };
}

export function updateItemFromLineTotalInclusive(
  item: InvoiceLineItem,
  targetLineTotalInclusive: number,
  taxMode: TaxMode
): InvoiceLineItem {
  const safeTotal = Math.max(0, Number(targetLineTotalInclusive) || 0);
  const { totalTaxPercent } = getEffectiveLineTaxRates(item, taxMode);
  const targetTaxable = safeTotal / (1 + totalTaxPercent / 100);
  return updateItemFromTaxableValue(item, targetTaxable, taxMode);
}

export function updateItemTaxRates(
  item: InvoiceLineItem,
  changes: { cgstPercent?: number; sgstPercent?: number; igstPercent?: number },
  taxMode: TaxMode
): InvoiceLineItem {
  const mode = normalizeTaxMode(taxMode);
  let cgst =
    changes.cgstPercent !== undefined
      ? Math.min(100, Math.max(0, Number(changes.cgstPercent) || 0))
      : item.cgstPercent ?? roundCurrency((item.taxPercent || 0) / 2);
  let sgst =
    changes.sgstPercent !== undefined
      ? Math.min(100, Math.max(0, Number(changes.sgstPercent) || 0))
      : item.sgstPercent ?? roundCurrency((item.taxPercent || 0) / 2);
  let igst =
    changes.igstPercent !== undefined
      ? Math.min(100, Math.max(0, Number(changes.igstPercent) || 0))
      : item.igstPercent ?? (item.taxPercent || 0);

  let totalTax = item.taxPercent;
  if (mode === 'CGST_SGST') {
    totalTax = roundCurrency(cgst + sgst);
    igst = totalTax;
  } else if (mode === 'IGST') {
    totalTax = roundCurrency(igst);
    cgst = roundCurrency(igst / 2);
    sgst = roundCurrency(igst - cgst);
  } else {
    totalTax = 0;
  }

  const nextItem: InvoiceLineItem = {
    ...item,
    cgstPercent: cgst,
    sgstPercent: sgst,
    igstPercent: igst,
    taxPercent: totalTax,
  };

  if (nextItem.priceEntryMode === 'INCLUSIVE' && nextItem.unitPriceInclusive !== undefined) {
    return updateItemFromInclusiveRate(nextItem, nextItem.unitPriceInclusive, mode);
  }
  return updateItemFromExclusiveRate(nextItem, nextItem.unitPrice, mode);
}

export function calculateInvoiceSummary(invoice: Invoice): InvoiceSummaryCalculation {
  const taxMode = normalizeTaxMode(invoice.taxMode);
  const lines: Record<string, LineCalculation> = {};
  let totalPackages = 0;
  let totalUnits = 0;
  let merchandiseSubtotal = 0;
  let packagingSubtotal = 0;
  let itemDiscountTotal = 0;
  let taxableSubtotalBeforeExtraDiscount = 0;
  let totalTax = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const slabMap = new Map<
    string,
    {
      rate: number;
      cgstRate: number;
      sgstRate: number;
      igstRate: number;
      taxableAmount: number;
      cgst: number;
      sgst: number;
      igst: number;
      totalTax: number;
    }
  >();

  for (const item of invoice.items) {
    const calc = calculateLineItem(item, taxMode);
    lines[item.id] = calc;
    totalPackages += Math.max(0, Number(item.packageCount) || 0);
    totalUnits += Math.max(0, Number(item.quantity) || 0);
    merchandiseSubtotal = roundCurrency(merchandiseSubtotal + calc.grossMerchandiseAmount);
    packagingSubtotal = roundCurrency(packagingSubtotal + calc.packagingAmount);
    itemDiscountTotal = roundCurrency(itemDiscountTotal + calc.discountAmount);
    taxableSubtotalBeforeExtraDiscount = roundCurrency(
      taxableSubtotalBeforeExtraDiscount + calc.taxableAmount
    );
    totalTax = roundCurrency(totalTax + calc.taxAmount);
    cgstTotal = roundCurrency(cgstTotal + calc.cgstAmount);
    sgstTotal = roundCurrency(sgstTotal + calc.sgstAmount);
    igstTotal = roundCurrency(igstTotal + calc.igstAmount);

    const slabKey = `${calc.effectiveTaxPercent}-${calc.effectiveCgstPercent}-${calc.effectiveSgstPercent}-${calc.effectiveIgstPercent}`;
    const existing = slabMap.get(slabKey) || {
      rate: calc.effectiveTaxPercent,
      cgstRate: calc.effectiveCgstPercent,
      sgstRate: calc.effectiveSgstPercent,
      igstRate: calc.effectiveIgstPercent,
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      totalTax: 0,
    };
    existing.taxableAmount = roundCurrency(existing.taxableAmount + calc.taxableAmount);
    existing.cgst = roundCurrency(existing.cgst + calc.cgstAmount);
    existing.sgst = roundCurrency(existing.sgst + calc.sgstAmount);
    existing.igst = roundCurrency(existing.igst + calc.igstAmount);
    existing.totalTax = roundCurrency(existing.totalTax + calc.taxAmount);
    slabMap.set(slabKey, existing);
  }

  const additionalDiscountAmount = roundCurrency(
    Math.min(
      taxableSubtotalBeforeExtraDiscount,
      Math.max(0, Number(invoice.additionalDiscountAmount) || 0)
    )
  );
  const taxableSubtotal = roundCurrency(
    Math.max(0, taxableSubtotalBeforeExtraDiscount - additionalDiscountAmount)
  );
  const shippingAndHandling = roundCurrency(
    Math.max(0, Number(invoice.shippingAndHandling) || 0)
  );

  const rawGrandTotal = roundCurrency(taxableSubtotal + totalTax + shippingAndHandling);
  const grandTotal = invoice.roundOff ? Math.round(rawGrandTotal) : rawGrandTotal;
  const roundOffAdjustment = roundCurrency(grandTotal - rawGrandTotal);

  const taxSlabBreakdown = Array.from(slabMap.values()).sort((a, b) => a.rate - b.rate);

  return {
    lines,
    totalPackages,
    totalUnits,
    merchandiseSubtotal,
    packagingSubtotal,
    itemDiscountTotal,
    additionalDiscountAmount,
    taxableSubtotal,
    totalTax,
    cgstTotal,
    sgstTotal,
    igstTotal,
    shippingAndHandling,
    rawGrandTotal,
    roundOffAdjustment,
    grandTotal,
    taxSlabBreakdown,
  };
}

export function formatPackagePlural(type: string, count: number): string {
  if (count === 1) return type;
  if (type.endsWith('x') || type.endsWith('s') || type.endsWith('ch')) {
    return `${type}es`;
  }
  return `${type}s`;
}

export function formatTaxModeLabel(taxMode: string): string {
  const normalized = normalizeTaxMode(taxMode);
  switch (normalized) {
    case 'CGST_SGST':
      return 'CGST + SGST';
    case 'IGST':
      return 'IGST';
    case 'EXEMPT':
      return 'GST Exempt (0%)';
  }
}

export function getCurrencySymbol(): string {
  return '₹';
}

export function formatCurrency(amount: number, _currency = 'INR'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `₹${safeAmount.toFixed(2)}`;
  }
}

export function formatPdfCurrency(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const isNegative = safeAmount < 0;
  const absVal = Math.abs(safeAmount);
  try {
    const formattedNumber = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absVal);
    return `${isNegative ? '-' : ''}Rs. ${formattedNumber}`;
  } catch {
    return `${isNegative ? '-' : ''}Rs. ${absVal.toFixed(2)}`;
  }
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitsToWords(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ONES[n % 10] : '');
}

function threeDigitsToWords(n: number): string {
  if (n === 0) return '';
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  const hPart = hundreds > 0 ? `${ONES[hundreds]} Hundred` : '';
  const rPart = twoDigitsToWords(rem);
  return [hPart, rPart].filter(Boolean).join(' ');
}

function convertIndianIntegerToWords(num: number): string {
  if (num === 0) return '';
  const parts: string[] = [];

  const crore = Math.floor(num / 10000000);
  let rem = num % 10000000;

  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;

  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (crore > 0) {
    parts.push(`${convertIndianIntegerToWords(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${twoDigitsToWords(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${twoDigitsToWords(thousand)} Thousand`);
  }
  if (rem > 0) {
    parts.push(threeDigitsToWords(rem));
  }

  return parts.join(' ');
}

export function amountToWords(amount: number, _currency = 'INR'): string {
  const safe = Math.max(0, roundCurrency(amount));
  const whole = Math.floor(safe);
  const paise = Math.round((safe - whole) * 100);

  if (whole === 0 && paise === 0) {
    return 'Zero Rupees Only';
  }

  const mainWords = whole > 0 ? `${convertIndianIntegerToWords(whole)} Rupees` : '';
  const subWords = paise > 0 ? `${twoDigitsToWords(paise)} Paise` : '';

  if (mainWords && subWords) {
    return `${mainWords} and ${subWords} Only`;
  }
  return `${mainWords || subWords} Only`;
}

export function generateNextInvoiceNumber(invoices: Invoice[]): string {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  let maxSeq = 100;

  for (const inv of invoices) {
    const match = inv.invoiceNumber.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!Number.isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

export function filterAndSortInvoices(
  invoices: Invoice[],
  filters: DashboardFilters,
  referenceTodayStr?: string
): Invoice[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const todayStr = referenceTodayStr || new Date().toISOString().slice(0, 10);
  const todayDate = new Date(`${todayStr}T00:00:00Z`);

  const filtered = invoices.filter((inv) => {
    if (filters.status !== 'All' && inv.status !== filters.status) {
      return false;
    }

    if (query) {
      const haystacks = [
        inv.invoiceNumber,
        inv.buyer.companyName,
        inv.buyer.name,
        inv.buyer.taxId,
        inv.buyer.email,
        inv.purchaseOrderNumber,
        ...inv.items.map((i) => i.name),
        ...inv.items.map((i) => i.skuOrHsn),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!haystacks.includes(query)) {
        return false;
      }
    }

    const issueStr = inv.issueDate;
    if (filters.datePreset === 'today') {
      if (issueStr !== todayStr) return false;
    } else if (filters.datePreset === 'last7') {
      const d = new Date(`${issueStr}T00:00:00Z`);
      const diffDays = (todayDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 0 || diffDays > 7) return false;
    } else if (filters.datePreset === 'last30') {
      const d = new Date(`${issueStr}T00:00:00Z`);
      const diffDays = (todayDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < 0 || diffDays > 30) return false;
    } else if (filters.datePreset === 'thisMonth') {
      if (issueStr.slice(0, 7) !== todayStr.slice(0, 7)) return false;
    } else if (filters.datePreset === 'custom') {
      if (filters.dateFrom && issueStr < filters.dateFrom) return false;
      if (filters.dateTo && issueStr > filters.dateTo) return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sortBy === 'dateDesc') {
      return b.issueDate.localeCompare(a.issueDate) || b.invoiceNumber.localeCompare(a.invoiceNumber);
    }
    if (filters.sortBy === 'dateAsc') {
      return a.issueDate.localeCompare(b.issueDate) || a.invoiceNumber.localeCompare(b.invoiceNumber);
    }
    if (filters.sortBy === 'amountDesc') {
      return calculateInvoiceSummary(b).grandTotal - calculateInvoiceSummary(a).grandTotal;
    }
    if (filters.sortBy === 'amountAsc') {
      return calculateInvoiceSummary(a).grandTotal - calculateInvoiceSummary(b).grandTotal;
    }
    return a.invoiceNumber.localeCompare(b.invoiceNumber);
  });
}

export function normalizeInvoiceRecord(raw: Invoice): Invoice {
  const taxMode = normalizeTaxMode(raw.taxMode);
  const items: InvoiceLineItem[] = (raw.items || []).map((item) => {
    const baseTax = Number(item.taxPercent) || 0;
    const cgst =
      item.cgstPercent !== undefined ? Number(item.cgstPercent) : roundCurrency(baseTax / 2);
    const sgst =
      item.sgstPercent !== undefined
        ? Number(item.sgstPercent)
        : roundCurrency(baseTax - cgst);
    const igst = item.igstPercent !== undefined ? Number(item.igstPercent) : baseTax;
    const effectiveRate = taxMode === 'CGST_SGST' ? cgst + sgst : taxMode === 'IGST' ? igst : 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const unitPriceInclusive =
      item.unitPriceInclusive !== undefined
        ? Number(item.unitPriceInclusive)
        : roundCurrency(unitPrice * (1 + effectiveRate / 100));

    return {
      ...item,
      priceEntryMode: item.priceEntryMode || 'EXCLUSIVE',
      unitPrice,
      unitPriceInclusive,
      cgstPercent: cgst,
      sgstPercent: sgst,
      igstPercent: igst,
      taxPercent: taxMode === 'EXEMPT' ? 0 : effectiveRate,
    };
  });

  return {
    ...raw,
    currency: 'INR',
    taxMode,
    items,
  };
}

export function validateAndParseBackupJson(rawJson: string): {
  valid: boolean;
  error?: string;
  invoices?: Invoice[];
  backup?: Partial<BilluminatiBackup>;
} {
  try {
    const parsed = JSON.parse(rawJson);

    const candidateInvoices: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.invoices)
      ? parsed.invoices
      : null!;

    if (!candidateInvoices) {
      return {
        valid: false,
        error: 'JSON file does not contain a valid "invoices" array.',
      };
    }

    const validatedInvoices: Invoice[] = [];
    for (let i = 0; i < candidateInvoices.length; i++) {
      const item = candidateInvoices[i] as Partial<Invoice>;
      if (!item || typeof item !== 'object') {
        return { valid: false, error: `Entry at index ${i} is not an object.` };
      }
      if (!item.invoiceNumber || typeof item.invoiceNumber !== 'string') {
        return {
          valid: false,
          error: `Invoice at index ${i} is missing a valid invoiceNumber.`,
        };
      }
      if (!Array.isArray(item.items)) {
        return {
          valid: false,
          error: `Invoice "${item.invoiceNumber}" is missing a line items array.`,
        };
      }
      validatedInvoices.push(normalizeInvoiceRecord(item as Invoice));
    }

    return {
      valid: true,
      invoices: validatedInvoices,
      backup: Array.isArray(parsed)
        ? { invoices: validatedInvoices }
        : { ...parsed, invoices: validatedInvoices },
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? `Invalid JSON syntax: ${err.message}` : 'Invalid JSON file.',
    };
  }
}
