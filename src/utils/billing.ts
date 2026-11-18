import {
  BilluminatiBackup,
  CatalogItem,
  DashboardFilters,
  Invoice,
  InvoiceLineItem,
  PackagingType,
  TaxMode,
} from '../types/billing';

export interface LineCalculation {
  unitPriceExclusive: number;
  unitPriceInclusive: number;
  grossMerchandiseAmount: number;
  packagingAmount: number;
  grossBeforeDiscount: number;
  discountAmount: number; // User-entered discount (₹)
  preTaxDiscountAmount: number; // Pre-tax reduction deducted from grossMerchandiseAmount to get taxableAmount
  taxableAmount: number;
  effectiveCgstPercent: number;
  effectiveSgstPercent: number;
  effectiveIgstPercent: number;
  effectiveTaxPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxAmount: number;
  grossLineTotal: number;
  totalLineAmount: number;
}

export interface InvoiceSummaryCalculation {
  lines: Record<string, LineCalculation>;
  totalPackages: number;
  totalUnits: number;
  merchandiseSubtotal: number;
  lineTaxableSubtotal: number;
  packagingSubtotal: number;
  itemDiscountTotal: number;
  itemPreTaxDiscountTotal: number;
  additionalDiscountAmount: number;
  additionalPreTaxDiscountAmount: number;
  calculateDiscountOnFinalValue: boolean;
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

export interface SquareLogoPlacement {
  canvasSize: number;
  sourceSquareSize: number;
  sourceOffsetX: number;
  sourceOffsetY: number;
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
}

export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/**
 * Computes the square canvas expansion and 512px downscale geometry for a Seller Logo.
 * If the logo is not square, expands the canvas to a square (max(width, height))
 * centered without changing the logo's aspect ratio, and scales to 512px side size.
 */
export function calculateLogoSquarePlacement(
  naturalWidth: number,
  naturalHeight: number,
  targetSide = 512
): SquareLogoPlacement {
  const safeW = Math.max(1, Math.round(Number(naturalWidth) || 1));
  const safeH = Math.max(1, Math.round(Number(naturalHeight) || 1));
  const sourceSquareSize = Math.max(safeW, safeH);
  const sourceOffsetX = Math.round((sourceSquareSize - safeW) / 2);
  const sourceOffsetY = Math.round((sourceSquareSize - safeH) / 2);

  const scale = targetSide / sourceSquareSize;
  const drawWidth = Math.max(1, Math.round(safeW * scale));
  const drawHeight = Math.max(1, Math.round(safeH * scale));
  const offsetX = Math.round((targetSide - drawWidth) / 2);
  const offsetY = Math.round((targetSide - drawHeight) / 2);

  return {
    canvasSize: targetSide,
    sourceSquareSize,
    sourceOffsetX,
    sourceOffsetY,
    drawWidth,
    drawHeight,
    offsetX,
    offsetY,
  };
}

/**
 * Browser helper: takes an uploaded image File, expands non-square images onto a square
 * canvas without altering aspect ratio, downscales to 512x512px, and returns a PNG data URL.
 */
export function processSellerLogoFile(
  file: File,
  targetSide = 512
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, WebP, or SVG).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read the selected image file.'));
    reader.onload = () => {
      const srcDataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode the uploaded image.'));
      img.onload = () => {
        try {
          const w = Math.max(1, img.naturalWidth || img.width || targetSide);
          const h = Math.max(1, img.naturalHeight || img.height || targetSide);
          const placement = calculateLogoSquarePlacement(w, h, targetSide);

          // Step 1: Expand canvas to square (sourceSquareSize x sourceSquareSize) preserving aspect ratio
          const squareCanvas = document.createElement('canvas');
          squareCanvas.width = placement.sourceSquareSize;
          squareCanvas.height = placement.sourceSquareSize;
          const sqCtx = squareCanvas.getContext('2d');
          if (!sqCtx) {
            reject(new Error('Canvas 2D context is not available.'));
            return;
          }
          sqCtx.clearRect(0, 0, placement.sourceSquareSize, placement.sourceSquareSize);
          sqCtx.imageSmoothingEnabled = true;
          sqCtx.imageSmoothingQuality = 'high';
          sqCtx.drawImage(
            img,
            placement.sourceOffsetX,
            placement.sourceOffsetY,
            w,
            h
          );

          // Step 2: Downscale / normalize square canvas to 512x512px before saving
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = placement.canvasSize;
          finalCanvas.height = placement.canvasSize;
          const finalCtx = finalCanvas.getContext('2d');
          if (!finalCtx) {
            reject(new Error('Canvas 2D context is not available.'));
            return;
          }
          finalCtx.clearRect(0, 0, placement.canvasSize, placement.canvasSize);
          finalCtx.imageSmoothingEnabled = true;
          finalCtx.imageSmoothingQuality = 'high';
          finalCtx.drawImage(
            squareCanvas,
            0,
            0,
            placement.sourceSquareSize,
            placement.sourceSquareSize,
            0,
            0,
            placement.canvasSize,
            placement.canvasSize
          );

          resolve(finalCanvas.toDataURL('image/png'));
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Logo processing failed.'));
        }
      };
      img.src = srcDataUrl;
    };
    reader.readAsDataURL(file);
  });
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

/**
 * Computes line item amounts where discounts reduce the pre-tax Taxable Value
 * rather than being deducted after taxes:
 * - When `calculateDiscountOnFinalValue === true` (default):
 *   The user-entered `discountAmount` specifies the exact reduction on the final
 *   (tax-inclusive) line amount. The pre-tax `taxableAmount` and GST (`cgstAmount`,
 *   `sgstAmount`, `igstAmount`) are calculated on the discounted base so that
 *   `taxableAmount + taxAmount === grossLineTotal - discountAmount`.
 * - When `calculateDiscountOnFinalValue === false`:
 *   The user-entered `discountAmount` is deducted directly from the pre-tax base
 *   (`grossMerchandiseAmount`), and GST is calculated on that reduced `taxableAmount`.
 */
export function calculateLineItem(
  item: InvoiceLineItem,
  rawTaxMode: TaxMode,
  calculateDiscountOnFinalValue = true
): LineCalculation {
  const taxMode = normalizeTaxMode(rawTaxMode);
  const qty = Math.max(0, Number(item.quantity) || 0);

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
  const packagingAmount = 0;
  const grossBeforeDiscount = grossMerchandiseAmount;

  // Compute undiscounted gross line total for reference
  let grossCgst = 0;
  let grossSgst = 0;
  let grossIgst = 0;
  if (taxMode === 'CGST_SGST') {
    grossCgst = roundCurrency(grossMerchandiseAmount * (effectiveCgstPercent / 100));
    grossSgst = roundCurrency(grossMerchandiseAmount * (effectiveSgstPercent / 100));
  } else if (taxMode === 'IGST') {
    grossIgst = roundCurrency(grossMerchandiseAmount * (effectiveIgstPercent / 100));
  }
  const grossLineTotal =
    item.priceEntryMode === 'INCLUSIVE'
      ? roundCurrency(qty * unitPriceInclusive)
      : roundCurrency(grossMerchandiseAmount + grossCgst + grossSgst + grossIgst);

  const rawDiscountRupees = Math.max(0, Number(item.discountAmount) || 0);

  let discountAmount = 0;
  let preTaxDiscountAmount = 0;
  let taxableAmount = grossMerchandiseAmount;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let taxAmount = 0;
  let totalLineAmount = grossLineTotal;

  if (calculateDiscountOnFinalValue) {
    discountAmount = roundCurrency(Math.min(grossLineTotal, rawDiscountRupees));
    if (discountAmount === 0 && item.priceEntryMode !== 'INCLUSIVE') {
      taxableAmount = grossMerchandiseAmount;
      cgstAmount = grossCgst;
      sgstAmount = grossSgst;
      igstAmount = grossIgst;
      taxAmount = roundCurrency(cgstAmount + sgstAmount + igstAmount);
      totalLineAmount = grossLineTotal;
      preTaxDiscountAmount = 0;
    } else {
      const targetFinalTotal = roundCurrency(Math.max(0, grossLineTotal - discountAmount));
      const estimatedTaxable = roundCurrency(targetFinalTotal / taxMultiplier);
      if (taxMode === 'CGST_SGST') {
        cgstAmount = roundCurrency(estimatedTaxable * (effectiveCgstPercent / 100));
        sgstAmount = roundCurrency(estimatedTaxable * (effectiveSgstPercent / 100));
      } else if (taxMode === 'IGST') {
        igstAmount = roundCurrency(estimatedTaxable * (effectiveIgstPercent / 100));
      }
      taxAmount = roundCurrency(cgstAmount + sgstAmount + igstAmount);
      taxableAmount =
        taxMode === 'EXEMPT'
          ? targetFinalTotal
          : roundCurrency(Math.max(0, targetFinalTotal - taxAmount));
      totalLineAmount = targetFinalTotal;
      preTaxDiscountAmount = roundCurrency(
        Math.max(0, grossMerchandiseAmount - taxableAmount)
      );
    }
  } else {
    discountAmount = roundCurrency(Math.min(grossMerchandiseAmount, rawDiscountRupees));
    preTaxDiscountAmount = discountAmount;
    taxableAmount = roundCurrency(Math.max(0, grossMerchandiseAmount - preTaxDiscountAmount));
    if (taxMode === 'CGST_SGST') {
      cgstAmount = roundCurrency(taxableAmount * (effectiveCgstPercent / 100));
      sgstAmount = roundCurrency(taxableAmount * (effectiveSgstPercent / 100));
    } else if (taxMode === 'IGST') {
      igstAmount = roundCurrency(taxableAmount * (effectiveIgstPercent / 100));
    }
    taxAmount = roundCurrency(cgstAmount + sgstAmount + igstAmount);
    totalLineAmount = roundCurrency(taxableAmount + taxAmount);
  }

  return {
    unitPriceExclusive: roundCurrency(unitPriceExclusive),
    unitPriceInclusive,
    grossMerchandiseAmount,
    packagingAmount,
    grossBeforeDiscount,
    discountAmount,
    preTaxDiscountAmount,
    taxableAmount,
    effectiveCgstPercent,
    effectiveSgstPercent,
    effectiveIgstPercent,
    effectiveTaxPercent,
    cgstAmount,
    sgstAmount,
    igstAmount,
    taxAmount,
    grossLineTotal,
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
  taxMode: TaxMode,
  calculateDiscountOnFinalValue = true
): InvoiceLineItem {
  const safeTaxable = Math.max(0, Number(targetTaxableValue) || 0);
  const qty = Math.max(1, Number(item.quantity) || 1);
  const discountRupees = Math.max(0, Number(item.discountAmount) || 0);
  const { totalTaxPercent } = getEffectiveLineTaxRates(item, taxMode);
  const taxMultiplier = 1 + totalTaxPercent / 100;

  const preTaxDiscount = calculateDiscountOnFinalValue
    ? discountRupees / taxMultiplier
    : discountRupees;
  const grossMerchandiseNeeded = safeTaxable + preTaxDiscount;
  const newExclUnitPrice = roundRate(grossMerchandiseNeeded / qty);
  const newInclUnitPrice = roundCurrency(newExclUnitPrice * taxMultiplier);

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
  taxMode: TaxMode,
  calculateDiscountOnFinalValue = true
): InvoiceLineItem {
  const safeTotal = Math.max(0, Number(targetLineTotalInclusive) || 0);
  const { totalTaxPercent } = getEffectiveLineTaxRates(item, taxMode);
  const taxMultiplier = 1 + totalTaxPercent / 100;
  const targetTaxable = safeTotal / taxMultiplier;
  return updateItemFromTaxableValue(
    item,
    targetTaxable,
    taxMode,
    calculateDiscountOnFinalValue
  );
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

/**
 * Returns the tax-inclusive unit price of a saved CatalogItem.
 * Supports both new catalog items with explicit `unitPriceInclusive` and legacy items.
 */
export function getCatalogItemInclusivePrice(item: CatalogItem): number {
  const tax = Math.max(0, Number(item.taxPercent) || 0);
  if (
    item.unitPriceInclusive !== undefined &&
    Number.isFinite(Number(item.unitPriceInclusive)) &&
    Number(item.unitPriceInclusive) >= 0
  ) {
    return roundCurrency(Number(item.unitPriceInclusive));
  }
  const excl = Math.max(0, Number(item.unitPrice) || 0);
  return roundCurrency(excl * (1 + tax / 100));
}

/**
 * Creates a CatalogItem from a user-entered tax-inclusive unit price and tax percentage,
 * automatically computing and storing the exclusive base unit price.
 */
export function createCatalogItemFromInclusivePrice(input: {
  id?: string;
  name: string;
  skuOrHsn: string;
  packagingType: PackagingType;
  unitPriceInclusive: number;
  taxPercent: number;
}): CatalogItem {
  const safeIncl = roundCurrency(Math.max(0, Number(input.unitPriceInclusive) || 0));
  const safeTax = roundCurrency(Math.min(100, Math.max(0, Number(input.taxPercent) || 0)));
  const excl = roundCurrency(safeIncl / (1 + safeTax / 100));
  return {
    id: input.id || `cat-${Date.now()}`,
    name: input.name.trim(),
    skuOrHsn: input.skuOrHsn.trim(),
    packagingType: input.packagingType,
    unitsPerPackage: 1,
    unitPrice: excl,
    unitPriceInclusive: safeIncl,
    packagingCostPerPkg: 0,
    taxPercent: safeTax,
  };
}

export function calculateInvoiceSummary(invoice: Invoice): InvoiceSummaryCalculation {
  const taxMode = normalizeTaxMode(invoice.taxMode);
  const calculateDiscountOnFinalValue = true;
  const lines: Record<string, LineCalculation> = {};
  let totalPackages = 0;
  let totalUnits = 0;
  let merchandiseSubtotal = 0;
  let packagingSubtotal = 0;
  let itemDiscountTotal = 0;
  let itemPreTaxDiscountTotal = 0;
  let lineTaxableSubtotal = 0;
  let lineTotalTax = 0;
  let lineCgstTotal = 0;
  let lineSgstTotal = 0;
  let lineIgstTotal = 0;
  let lineFinalTotal = 0;

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
      finalAmount: number;
    }
  >();

  for (const item of invoice.items) {
    const calc = calculateLineItem(item, taxMode, calculateDiscountOnFinalValue);
    lines[item.id] = calc;
    const itemQty = Math.max(0, Number(item.quantity) || 0);
    const itemPkg =
      item.packageCount !== undefined && Number(item.packageCount) > 0
        ? Math.max(0, Number(item.packageCount))
        : itemQty;
    totalPackages += itemPkg;
    totalUnits += itemQty;
    merchandiseSubtotal = roundCurrency(merchandiseSubtotal + calc.grossMerchandiseAmount);
    packagingSubtotal = roundCurrency(packagingSubtotal + calc.packagingAmount);
    itemDiscountTotal = roundCurrency(itemDiscountTotal + calc.discountAmount);
    itemPreTaxDiscountTotal = roundCurrency(
      itemPreTaxDiscountTotal + calc.preTaxDiscountAmount
    );
    lineTaxableSubtotal = roundCurrency(lineTaxableSubtotal + calc.taxableAmount);
    lineTotalTax = roundCurrency(lineTotalTax + calc.taxAmount);
    lineCgstTotal = roundCurrency(lineCgstTotal + calc.cgstAmount);
    lineSgstTotal = roundCurrency(lineSgstTotal + calc.sgstAmount);
    lineIgstTotal = roundCurrency(lineIgstTotal + calc.igstAmount);
    lineFinalTotal = roundCurrency(lineFinalTotal + calc.totalLineAmount);

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
      finalAmount: 0,
    };
    existing.taxableAmount = roundCurrency(existing.taxableAmount + calc.taxableAmount);
    existing.cgst = roundCurrency(existing.cgst + calc.cgstAmount);
    existing.sgst = roundCurrency(existing.sgst + calc.sgstAmount);
    existing.igst = roundCurrency(existing.igst + calc.igstAmount);
    existing.totalTax = roundCurrency(existing.totalTax + calc.taxAmount);
    existing.finalAmount = roundCurrency(existing.finalAmount + calc.totalLineAmount);
    slabMap.set(slabKey, existing);
  }

  // Freight & Forwarding Charges removed altogether
  const shippingAndHandling = 0;

  const rawAdditionalDiscount = Math.max(0, Number(invoice.additionalDiscountAmount) || 0);
  let additionalDiscountAmount = 0;
  let additionalPreTaxDiscountAmount = 0;
  let taxableSubtotal = lineTaxableSubtotal;
  let cgstTotal = lineCgstTotal;
  let sgstTotal = lineSgstTotal;
  let igstTotal = lineIgstTotal;
  let totalTax = lineTotalTax;
  let rawGrandTotal = lineFinalTotal;

  const sortedSlabs = Array.from(slabMap.values()).sort((a, b) => a.rate - b.rate);

  if (rawAdditionalDiscount > 0 && sortedSlabs.length > 0) {
    if (calculateDiscountOnFinalValue) {
      // Additional discount is calculated on the final value so that taxable value and GST
      // are reduced proportionally and the final payable amount changes by the exact discount entered.
      additionalDiscountAmount = roundCurrency(Math.min(lineFinalTotal, rawAdditionalDiscount));
      rawGrandTotal = roundCurrency(Math.max(0, lineFinalTotal - additionalDiscountAmount));
      const scaleRatio = lineFinalTotal > 0 ? rawGrandTotal / lineFinalTotal : 0;

      taxableSubtotal = 0;
      cgstTotal = 0;
      sgstTotal = 0;
      igstTotal = 0;
      totalTax = 0;

      let remainingFinal = rawGrandTotal;
      sortedSlabs.forEach((slab, idx) => {
        const isLast = idx === sortedSlabs.length - 1;
        const slabTargetFinal = isLast
          ? roundCurrency(Math.max(0, remainingFinal))
          : roundCurrency(slab.finalAmount * scaleRatio);
        remainingFinal = roundCurrency(remainingFinal - slabTargetFinal);

        const slabMultiplier = 1 + slab.rate / 100;
        const estTaxable = roundCurrency(slabTargetFinal / slabMultiplier);
        if (taxMode === 'CGST_SGST') {
          slab.cgst = roundCurrency(estTaxable * (slab.cgstRate / 100));
          slab.sgst = roundCurrency(estTaxable * (slab.sgstRate / 100));
          slab.igst = 0;
        } else if (taxMode === 'IGST') {
          slab.cgst = 0;
          slab.sgst = 0;
          slab.igst = roundCurrency(estTaxable * (slab.igstRate / 100));
        } else {
          slab.cgst = 0;
          slab.sgst = 0;
          slab.igst = 0;
        }
        slab.totalTax = roundCurrency(slab.cgst + slab.sgst + slab.igst);
        slab.taxableAmount =
          taxMode === 'EXEMPT'
            ? slabTargetFinal
            : roundCurrency(Math.max(0, slabTargetFinal - slab.totalTax));

        taxableSubtotal = roundCurrency(taxableSubtotal + slab.taxableAmount);
        cgstTotal = roundCurrency(cgstTotal + slab.cgst);
        sgstTotal = roundCurrency(sgstTotal + slab.sgst);
        igstTotal = roundCurrency(igstTotal + slab.igst);
        totalTax = roundCurrency(totalTax + slab.totalTax);
      });

      additionalPreTaxDiscountAmount = roundCurrency(
        Math.max(0, lineTaxableSubtotal - taxableSubtotal)
      );
    } else {
      // Additional discount is deducted directly from the pre-tax taxable value before taxes are applied.
      additionalDiscountAmount = roundCurrency(
        Math.min(lineTaxableSubtotal, rawAdditionalDiscount)
      );
      additionalPreTaxDiscountAmount = additionalDiscountAmount;
      const targetTaxableSubtotal = roundCurrency(
        Math.max(0, lineTaxableSubtotal - additionalPreTaxDiscountAmount)
      );
      const scaleRatio =
        lineTaxableSubtotal > 0 ? targetTaxableSubtotal / lineTaxableSubtotal : 0;

      taxableSubtotal = 0;
      cgstTotal = 0;
      sgstTotal = 0;
      igstTotal = 0;
      totalTax = 0;

      let remainingTaxable = targetTaxableSubtotal;
      sortedSlabs.forEach((slab, idx) => {
        const isLast = idx === sortedSlabs.length - 1;
        slab.taxableAmount = isLast
          ? roundCurrency(Math.max(0, remainingTaxable))
          : roundCurrency(slab.taxableAmount * scaleRatio);
        remainingTaxable = roundCurrency(remainingTaxable - slab.taxableAmount);

        if (taxMode === 'CGST_SGST') {
          slab.cgst = roundCurrency(slab.taxableAmount * (slab.cgstRate / 100));
          slab.sgst = roundCurrency(slab.taxableAmount * (slab.sgstRate / 100));
          slab.igst = 0;
        } else if (taxMode === 'IGST') {
          slab.cgst = 0;
          slab.sgst = 0;
          slab.igst = roundCurrency(slab.taxableAmount * (slab.igstRate / 100));
        } else {
          slab.cgst = 0;
          slab.sgst = 0;
          slab.igst = 0;
        }
        slab.totalTax = roundCurrency(slab.cgst + slab.sgst + slab.igst);

        taxableSubtotal = roundCurrency(taxableSubtotal + slab.taxableAmount);
        cgstTotal = roundCurrency(cgstTotal + slab.cgst);
        sgstTotal = roundCurrency(sgstTotal + slab.sgst);
        igstTotal = roundCurrency(igstTotal + slab.igst);
        totalTax = roundCurrency(totalTax + slab.totalTax);
      });

      rawGrandTotal = roundCurrency(taxableSubtotal + totalTax);
    }
  }

  const grandTotal = invoice.roundOff ? Math.round(rawGrandTotal) : rawGrandTotal;
  const roundOffAdjustment = roundCurrency(grandTotal - rawGrandTotal);

  const taxSlabBreakdown = sortedSlabs.map(
    ({ finalAmount: _unused, ...rest }) => rest
  );

  return {
    lines,
    totalPackages,
    totalUnits,
    merchandiseSubtotal,
    lineTaxableSubtotal,
    packagingSubtotal,
    itemDiscountTotal,
    itemPreTaxDiscountTotal,
    additionalDiscountAmount,
    additionalPreTaxDiscountAmount,
    calculateDiscountOnFinalValue,
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
  if (count === 1 || type === 'Dozen') return type;
  if (
    type.endsWith('x') ||
    type.endsWith('s') ||
    type.endsWith('ch') ||
    type.endsWith('sh')
  ) {
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
  return formatCurrency(amount, 'INR');
}

export interface ItemNameTypography {
  isLong: boolean;
  isVeryLong: boolean;
  pdfFontSizePt: number;
  pdfLineHeightMm: number;
  previewFontClass: string;
}

/**
 * Determines the font size and line-height scaling for line-item names in the PDF table
 * so long item names wrap across multiple lines in a smaller font instead of being cut short.
 */
export function getItemNameTypography(
  name: string,
  maxSingleLineChars = 28
): ItemNameTypography {
  const len = (name || '').trim().length;
  if (len > 56) {
    return {
      isLong: true,
      isVeryLong: true,
      pdfFontSizePt: 6.4,
      pdfLineHeightMm: 3.1,
      previewFontClass: 'text-[9.5px] leading-tight',
    };
  }
  if (len > maxSingleLineChars) {
    return {
      isLong: true,
      isVeryLong: false,
      pdfFontSizePt: 6.9,
      pdfLineHeightMm: 3.3,
      previewFontClass: 'text-[10px] leading-snug',
    };
  }
  return {
    isLong: false,
    isVeryLong: false,
    pdfFontSizePt: 7.8,
    pdfLineHeightMm: 3.7,
    previewFontClass: 'text-[11px] leading-snug',
  };
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

export function formatBuyerDisplayName(invoice: Invoice): string {
  if (invoice.isCashCustomer) return 'Cash Customer';
  return (
    invoice.buyer.companyName?.trim() ||
    invoice.buyer.name?.trim() ||
    'Unnamed Client'
  );
}

export function formatPaymentMethodSummary(invoice: Invoice): string {
  if (invoice.status !== 'Paid') {
    return '';
  }
  const method = (invoice.paymentMethod || '').trim();
  const details = (invoice.paymentMethodDetails || '').trim();
  const payDate = (invoice.paymentDate || '').trim();
  if (!method && !details && !payDate) {
    return '';
  }
  const baseLabel =
    method === 'Other'
      ? (invoice.paymentMethodOther || '').trim() || 'Other'
      : method;
  let result = '';
  if (baseLabel && details) {
    result = `${baseLabel} (${details})`;
  } else {
    result = baseLabel || details;
  }
  if (payDate) {
    result = result ? `${result} · Paid on ${payDate}` : `Paid on ${payDate}`;
  }
  return result;
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
        inv.isCashCustomer ? 'Cash Customer' : inv.buyer.companyName,
        inv.isCashCustomer ? '' : inv.buyer.name,
        inv.isCashCustomer ? '' : inv.buyer.taxId,
        inv.isCashCustomer ? '' : inv.buyer.email,
        inv.purchaseOrderNumber,
        inv.paymentMethod,
        inv.paymentMethodOther,
        inv.paymentDate,
        inv.paymentMethodDetails,
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

export function normalizeCatalogItem(
  raw: Partial<CatalogItem>,
  fallbackIndex = 0
): CatalogItem {
  const taxPercent = roundCurrency(
    Math.min(100, Math.max(0, Number(raw.taxPercent ?? 18) || 0))
  );
  const hasIncl =
    raw.unitPriceInclusive !== undefined &&
    Number.isFinite(Number(raw.unitPriceInclusive)) &&
    Number(raw.unitPriceInclusive) >= 0;
  const hasExcl =
    raw.unitPrice !== undefined &&
    Number.isFinite(Number(raw.unitPrice)) &&
    Number(raw.unitPrice) >= 0;

  let unitPrice = hasExcl ? roundCurrency(Number(raw.unitPrice)) : 0;
  let unitPriceInclusive = hasIncl
    ? roundCurrency(Number(raw.unitPriceInclusive))
    : roundCurrency(unitPrice * (1 + taxPercent / 100));

  if (hasIncl && !hasExcl) {
    unitPrice = roundCurrency(unitPriceInclusive / (1 + taxPercent / 100));
  } else if (hasExcl && !hasIncl) {
    unitPriceInclusive = roundCurrency(unitPrice * (1 + taxPercent / 100));
  }

  return {
    id: raw.id || `cat-${Date.now()}-${fallbackIndex}`,
    name: String(raw.name || 'Catalog Item').trim(),
    skuOrHsn: String(raw.skuOrHsn || '').trim(),
    packagingType: (raw.packagingType as PackagingType) || 'Box',
    unitsPerPackage: 1,
    unitPrice,
    unitPriceInclusive,
    packagingCostPerPkg: 0,
    taxPercent,
  };
}

export function normalizeInvoiceRecord(
  raw: Invoice,
  fallbackIndex = 0
): Invoice {
  const taxMode = normalizeTaxMode(raw.taxMode);
  const nowIso = new Date().toISOString();
  const todayStr = nowIso.slice(0, 10);

  const items: InvoiceLineItem[] = (raw.items || []).map((item, idx) => {
    const baseTax = Number(item.taxPercent ?? 18) || 0;
    const cgst =
      item.cgstPercent !== undefined
        ? Number(item.cgstPercent)
        : roundCurrency(baseTax / 2);
    const sgst =
      item.sgstPercent !== undefined
        ? Number(item.sgstPercent)
        : roundCurrency(baseTax - cgst);
    const igst =
      item.igstPercent !== undefined ? Number(item.igstPercent) : baseTax;
    const effectiveRate =
      taxMode === 'CGST_SGST' ? cgst + sgst : taxMode === 'IGST' ? igst : 0;

    const quantity = Math.max(0, Number(item.quantity ?? item.packageCount ?? 1) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const unitPriceInclusive =
      item.unitPriceInclusive !== undefined &&
      Number.isFinite(Number(item.unitPriceInclusive))
        ? Math.max(0, Number(item.unitPriceInclusive))
        : roundCurrency(unitPrice * (1 + effectiveRate / 100));

    let discountAmount = 0;
    if (
      item.discountAmount !== undefined &&
      Number.isFinite(Number(item.discountAmount))
    ) {
      discountAmount = Math.max(0, Number(item.discountAmount));
    } else if (
      item.discountPercent !== undefined &&
      Number(item.discountPercent) > 0
    ) {
      // Legacy v1 compatibility: convert discountPercent into rupee discount on final value
      const grossIncl = roundCurrency(quantity * unitPriceInclusive);
      discountAmount = roundCurrency(
        grossIncl * (Math.min(100, Number(item.discountPercent)) / 100)
      );
    }

    return {
      ...item,
      id: item.id || `item-${Date.now()}-${fallbackIndex}-${idx}`,
      name: String(item.name || ''),
      description: item.description ? String(item.description) : '',
      skuOrHsn: String(item.skuOrHsn || ''),
      packagingType: (item.packagingType as PackagingType) || 'Box',
      unitsPerPackage: 1,
      packageCount: quantity,
      quantity,
      priceEntryMode: item.priceEntryMode || 'EXCLUSIVE',
      unitPrice,
      unitPriceInclusive,
      discountAmount,
      packagingCostPerPkg: 0,
      discountPercent: 0,
      cgstPercent: cgst,
      sgstPercent: sgst,
      igstPercent: igst,
      taxPercent: taxMode === 'EXEMPT' ? 0 : effectiveRate,
    };
  });

  const validStatuses = ['Paid', 'Pending', 'Overdue'] as const;
  const status = validStatuses.includes(raw.status as (typeof validStatuses)[number])
    ? (raw.status as (typeof validStatuses)[number])
    : 'Pending';
  const isPaid = status === 'Paid';
  const isCashCustomer = Boolean(raw.isCashCustomer);

  const rawSeller: Partial<Invoice['seller']> = raw.seller || {};
  const rawBuyer: Partial<Invoice['buyer']> = raw.buyer || {};
  const rawBank: Partial<Invoice['bankDetails']> = raw.bankDetails || {};
  const rawPdf: Partial<Invoice['pdfOptions']> = raw.pdfOptions || {};

  return {
    ...raw,
    id:
      raw.id ||
      `inv-${String(raw.invoiceNumber || '0').replace(/[^a-zA-Z0-9_-]/g, '')}-${fallbackIndex}`,
    invoiceNumber: String(raw.invoiceNumber || `INV-${fallbackIndex + 1}`).trim(),
    issueDate: raw.issueDate || todayStr,
    dueDate: isPaid ? '' : raw.dueDate || '',
    status,
    currency: 'INR',
    taxMode,
    placeOfSupply:
      raw.placeOfSupply !== undefined ? String(raw.placeOfSupply) : '27 - Maharashtra',
    purchaseOrderNumber: raw.purchaseOrderNumber
      ? String(raw.purchaseOrderNumber)
      : '',
    isCashCustomer,
    paymentMethod: isPaid ? raw.paymentMethod || '' : '',
    paymentMethodOther: isPaid ? raw.paymentMethodOther || '' : '',
    paymentDate: isPaid ? raw.paymentDate || '' : '',
    paymentMethodDetails: isPaid ? raw.paymentMethodDetails || '' : '',
    calculateDiscountOnFinalValue: true,
    seller: {
      name: String(rawSeller.name || ''),
      companyName: String(rawSeller.companyName || ''),
      taxId: String(rawSeller.taxId || ''),
      email: String(rawSeller.email || ''),
      phone: String(rawSeller.phone || ''),
      addressLine1: String(rawSeller.addressLine1 || ''),
      cityStatePostal: String(rawSeller.cityStatePostal || ''),
      country: String(rawSeller.country || 'India'),
      logoDataUrl: rawSeller.logoDataUrl || '',
    },
    buyer: {
      name: String(rawBuyer.name || ''),
      companyName: String(rawBuyer.companyName || ''),
      taxId: String(rawBuyer.taxId || ''),
      email: String(rawBuyer.email || ''),
      phone: String(rawBuyer.phone || ''),
      addressLine1: String(rawBuyer.addressLine1 || ''),
      cityStatePostal: String(rawBuyer.cityStatePostal || ''),
      country: String(rawBuyer.country || 'India'),
    },
    bankDetails: {
      bankName: String(rawBank.bankName || ''),
      accountName: String(rawBank.accountName || ''),
      accountNumber: String(rawBank.accountNumber || ''),
      routingOrIfsc: String(rawBank.routingOrIfsc || ''),
      swiftOrIban: rawBank.swiftOrIban ? String(rawBank.swiftOrIban) : '',
      paymentInstructions: rawBank.paymentInstructions
        ? String(rawBank.paymentInstructions)
        : '',
    },
    shippingAndHandling: 0,
    additionalDiscountAmount: Math.max(
      0,
      Number(raw.additionalDiscountAmount) || 0
    ),
    roundOff: raw.roundOff ?? true,
    notes: raw.notes ? String(raw.notes) : '',
    termsAndConditions: raw.termsAndConditions
      ? String(raw.termsAndConditions)
      : '',
    pdfOptions: {
      paperSize: rawPdf.paperSize || 'a4',
      orientation: rawPdf.orientation || 'portrait',
      marginPreset: rawPdf.marginPreset || 'standard',
      accentColor: rawPdf.accentColor || 'slate',
      headerTitle: rawPdf.headerTitle || 'TAX INVOICE',
      showSellerLogo: rawPdf.showSellerLogo ?? true,
      showSkuColumn: rawPdf.showSkuColumn ?? true,
      showPackagingColumn: rawPdf.showPackagingColumn ?? true,
      showDiscountColumn: rawPdf.showDiscountColumn ?? true,
      showTaxBreakdown: rawPdf.showTaxBreakdown ?? true,
      showAmountInWords: rawPdf.showAmountInWords ?? true,
      showBankDetails: rawPdf.showBankDetails ?? true,
      showSignatureBlock: rawPdf.showSignatureBlock ?? true,
      signatoryLabel: rawPdf.signatoryLabel || 'Authorized Signatory',
      footerNote: rawPdf.footerNote ?? '',
    },
    items,
    createdAt: raw.createdAt || nowIso,
    updatedAt: raw.updatedAt || nowIso,
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
    if (!parsed || typeof parsed !== 'object') {
      return {
        valid: false,
        error: 'JSON file does not contain a valid backup object or invoices array.',
      };
    }

    // Support: (1) full backup object { invoices: [...] }, (2) raw array of invoices [...], or (3) a single invoice object { invoiceNumber, items }
    const candidateInvoices: unknown[] | null = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.invoices)
      ? parsed.invoices
      : typeof parsed?.invoiceNumber === 'string' && Array.isArray(parsed?.items)
      ? [parsed]
      : null;

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
      validatedInvoices.push(normalizeInvoiceRecord(item as Invoice, i));
    }

    const backupObj: Partial<BilluminatiBackup> = Array.isArray(parsed)
      ? { invoices: validatedInvoices }
      : typeof parsed?.invoiceNumber === 'string' && !Array.isArray(parsed?.invoices)
      ? { invoices: validatedInvoices }
      : { ...parsed, invoices: validatedInvoices };

    if (Array.isArray(backupObj.catalog)) {
      backupObj.catalog = backupObj.catalog
        .filter((c) => c && typeof c === 'object' && typeof c.name === 'string')
        .map((c, idx) => normalizeCatalogItem(c, idx));
    }

    return {
      valid: true,
      invoices: validatedInvoices,
      backup: backupObj,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? `Invalid JSON syntax: ${err.message}` : 'Invalid JSON file.',
    };
  }
}
