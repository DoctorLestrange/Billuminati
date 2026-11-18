import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Save,
  FileDown,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  SlidersHorizontal,
  Building2,
  AlertCircle,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  CatalogItem,
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  PackagingType,
  PdfPageOptions,
  TaxMode,
} from '../types/billing';
import {
  amountToWords,
  calculateInvoiceSummary,
  formatCurrency,
  normalizeTaxMode,
  roundCurrency,
  updateItemFromExclusiveRate,
  updateItemFromInclusiveRate,
  updateItemFromLineTotalInclusive,
  updateItemFromTaxableValue,
  updateItemTaxRates,
} from '../utils/billing';

interface DynamicNumberInputProps {
  value: number;
  onChangeValue: (val: number) => void;
  ariaLabel: string;
  min?: number;
  max?: number;
  step?: string;
  className?: string;
}

/**
 * Prevents cursor jumping or decimal-point truncation while typing in bidirectional
 * calculated fields (such as Rate Excl. GST <-> Rate Incl. GST <-> Taxable Value <-> Line Total).
 * While focused, displays the user's raw keystrokes; when unfocused, syncs to the computed value.
 */
const DynamicNumberInput: React.FC<DynamicNumberInputProps> = ({
  value,
  onChangeValue,
  ariaLabel,
  min = 0,
  max,
  step = 'any',
  className = '',
}) => {
  const [focused, setFocused] = useState(false);
  const [rawText, setRawText] = useState(() => String(roundCurrency(value)));

  useEffect(() => {
    if (!focused) {
      setRawText(String(roundCurrency(value)));
    }
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setRawText(text);
    const parsed = parseFloat(text);
    if (!Number.isNaN(parsed)) {
      let clamped = Math.max(min, parsed);
      if (max !== undefined) clamped = Math.min(max, clamped);
      onChangeValue(clamped);
    } else if (text.trim() === '') {
      onChangeValue(0);
    }
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      aria-label={ariaLabel}
      value={focused ? rawText : roundCurrency(value)}
      onFocus={() => {
        setFocused(true);
        setRawText(String(roundCurrency(value)));
      }}
      onBlur={() => setFocused(false)}
      onChange={handleChange}
      className={className}
    />
  );
};

interface InvoiceEditorViewProps {
  initialInvoice: Invoice;
  catalog: CatalogItem[];
  isNew: boolean;
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
  onOpenPdfPreview: (invoice: Invoice) => void;
}

const PACKAGING_OPTIONS: PackagingType[] = [
  'Unit',
  'Box',
  'Carton',
  'Pallet',
  'Crate',
  'Bundle',
  'Pack',
  'Bag',
  'Roll',
  'Piece',
];

const GST_MODE_OPTIONS: Array<{ value: TaxMode; label: string }> = [
  { value: 'CGST_SGST', label: 'CGST + SGST (Intra-State GST)' },
  { value: 'IGST', label: 'IGST (Inter-State GST)' },
  { value: 'EXEMPT', label: 'GST Exempt / Nil Rated (0%)' },
];

export const InvoiceEditorView: React.FC<InvoiceEditorViewProps> = ({
  initialInvoice,
  catalog,
  isNew,
  onSave,
  onCancel,
  onOpenPdfPreview,
}) => {
  const [invoice, setInvoice] = useState<Invoice>(() => ({
    ...initialInvoice,
    currency: 'INR',
    taxMode: normalizeTaxMode(initialInvoice.taxMode),
  }));
  const [syncCgstSgst, setSyncCgstSgst] = useState(true);
  const [showSellerBankPanel, setShowSellerBankPanel] = useState(false);
  const [showPageOptionsPanel, setShowPageOptionsPanel] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  const taxMode = normalizeTaxMode(invoice.taxMode);
  const summary = calculateInvoiceSummary(invoice);

  const updateField = <K extends keyof Invoice>(field: K, value: Invoice[K]) => {
    setValidationError(null);
    setInvoice((prev) => ({
      ...prev,
      [field]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleTaxModeChange = (nextMode: TaxMode) => {
    setValidationError(null);
    setInvoice((prev) => ({
      ...prev,
      taxMode: nextMode,
      items: prev.items.map((item) =>
        updateItemTaxRates(
          item,
          {
            cgstPercent: item.cgstPercent,
            sgstPercent: item.sgstPercent,
            igstPercent: item.igstPercent,
          },
          nextMode
        )
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateBuyerField = (key: keyof Invoice['buyer'], value: string) => {
    setValidationError(null);
    setInvoice((prev) => ({
      ...prev,
      buyer: { ...prev.buyer, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateSellerField = (key: keyof Invoice['seller'], value: string) => {
    setInvoice((prev) => ({
      ...prev,
      seller: { ...prev.seller, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateBankField = (key: keyof Invoice['bankDetails'], value: string) => {
    setInvoice((prev) => ({
      ...prev,
      bankDetails: { ...prev.bankDetails, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  };

  const updatePdfOption = <K extends keyof PdfPageOptions>(
    key: K,
    value: PdfPageOptions[K]
  ) => {
    setInvoice((prev) => ({
      ...prev,
      pdfOptions: { ...prev.pdfOptions, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  };

  const replaceLineItem = (
    id: string,
    updater: (current: InvoiceLineItem) => InvoiceLineItem
  ) => {
    setValidationError(null);
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? updater(item) : item)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateLineItemBasic = (
    id: string,
    changes: Partial<InvoiceLineItem>,
    recalcQuantityFromPackages = false
  ) => {
    replaceLineItem(id, (item) => {
      const updated = { ...item, ...changes };
      if (recalcQuantityFromPackages) {
        const pkgCount = Math.max(0, Number(updated.packageCount) || 0);
        const unitsPerPkg = Math.max(1, Number(updated.unitsPerPackage) || 1);
        updated.quantity = pkgCount * unitsPerPkg;
      }
      return updated;
    });
  };

  const handleAddEmptyItem = () => {
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      description: '',
      skuOrHsn: '',
      packagingType: 'Box',
      unitsPerPackage: 1,
      packageCount: 1,
      quantity: 1,
      priceEntryMode: 'EXCLUSIVE',
      unitPrice: 0,
      unitPriceInclusive: 0,
      packagingCostPerPkg: 0,
      discountPercent: 0,
      taxPercent: taxMode === 'EXEMPT' ? 0 : 18,
      cgstPercent: 9,
      sgstPercent: 9,
      igstPercent: 18,
    };
    updateField('items', [...invoice.items, newItem]);
  };

  const handleAddFromCatalog = (preset: CatalogItem) => {
    const baseGst = preset.taxPercent || 18;
    const halfGst = roundCurrency(baseGst / 2);
    const effectiveRate = taxMode === 'EXEMPT' ? 0 : baseGst;
    const inclPrice = roundCurrency(
      preset.unitPrice * (1 + effectiveRate / 100)
    );

    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: preset.name,
      description: '',
      skuOrHsn: preset.skuOrHsn,
      packagingType: preset.packagingType,
      unitsPerPackage: preset.unitsPerPackage,
      packageCount: 1,
      quantity: preset.unitsPerPackage,
      priceEntryMode: 'EXCLUSIVE',
      unitPrice: preset.unitPrice,
      unitPriceInclusive: inclPrice,
      packagingCostPerPkg: preset.packagingCostPerPkg,
      discountPercent: 0,
      taxPercent: effectiveRate,
      cgstPercent: halfGst,
      sgstPercent: roundCurrency(baseGst - halfGst),
      igstPercent: baseGst,
    };
    updateField('items', [...invoice.items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (invoice.items.length <= 1) {
      setValidationError('An invoice must contain at least one line item.');
      return;
    }
    updateField(
      'items',
      invoice.items.filter((i) => i.id !== id)
    );
  };

  const validateInvoice = (): boolean => {
    if (!invoice.invoiceNumber.trim()) {
      setValidationError('Please enter a valid Invoice Number.');
      return false;
    }
    if (!invoice.buyer.companyName.trim() && !invoice.buyer.name.trim()) {
      setValidationError(
        'Please enter the Buyer / Client Company Name or Contact Name.'
      );
      return false;
    }
    const emptyItem = invoice.items.find((i) => !i.name.trim());
    if (emptyItem) {
      setValidationError(
        'Every line item must have an Item Description / Name before saving.'
      );
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateInvoice()) return;
    onSave(invoice);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 2000);
  };

  const handlePreviewPdf = () => {
    if (!validateInvoice()) return;
    onSave(invoice);
    onOpenPdfPreview(invoice);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 self-start cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {isNew
                ? `New GST Tax Invoice (${invoice.invoiceNumber})`
                : `Edit GST Tax Invoice ${invoice.invoiceNumber}`}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter item rates exclusive or inclusive of GST, or type taxable value / line total directly for dynamic calculation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {saveSuccessToast && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 mr-1">
              <Check className="w-3.5 h-3.5" />
              Saved
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowPageOptionsPanel((prev) => !prev)}
            aria-expanded={showPageOptionsPanel}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              showPageOptionsPanel
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            PDF Page Settings
          </button>

          <button
            type="button"
            onClick={handlePreviewPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Preview & Export PDF
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Invoice
          </button>
        </div>
      </div>

      {validationError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 text-xs text-red-800 dark:text-red-200 flex items-center gap-2.5"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Tucked-Away PDF & Page Settings Drawer */}
      {showPageOptionsPanel && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                PDF Export & Document Customization
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Customize page format, orientation, margins, and visible GST invoice columns.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPageOptionsPanel(false)}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Close Panel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={invoice.pdfOptions.headerTitle}
                onChange={(e) => updatePdfOption('headerTitle', e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Paper Size
              </label>
              <select
                value={invoice.pdfOptions.paperSize}
                onChange={(e) =>
                  updatePdfOption(
                    'paperSize',
                    e.target.value as PdfPageOptions['paperSize']
                  )
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="a4">A4 Standard</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Orientation
              </label>
              <select
                value={invoice.pdfOptions.orientation}
                onChange={(e) =>
                  updatePdfOption(
                    'orientation',
                    e.target.value as PdfPageOptions['orientation']
                  )
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Margins
              </label>
              <select
                value={invoice.pdfOptions.marginPreset}
                onChange={(e) =>
                  updatePdfOption(
                    'marginPreset',
                    e.target.value as PdfPageOptions['marginPreset']
                  )
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="compact">Compact (10mm)</option>
                <option value="standard">Standard (15mm)</option>
                <option value="wide">Wide (22mm)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Accent Theme
              </label>
              <select
                value={invoice.pdfOptions.accentColor}
                onChange={(e) =>
                  updatePdfOption(
                    'accentColor',
                    e.target.value as PdfPageOptions['accentColor']
                  )
                }
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="slate">Executive Slate</option>
                <option value="indigo">Cobalt Indigo</option>
                <option value="emerald">Forest Emerald</option>
                <option value="amber">Industrial Amber</option>
                <option value="crimson">Crimson Ledger</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 pt-2 border-t border-slate-100 dark:border-slate-800">
            {(
              [
                ['showSkuColumn', 'HSN/SAC Column'],
                ['showPackagingColumn', 'Packaging Column'],
                ['showTaxBreakdown', 'GST Slab Summary'],
                ['showAmountInWords', 'Amount in Words'],
                ['showBankDetails', 'Bank & IFSC Details'],
                ['showSignatureBlock', 'Signature Line'],
              ] as const
            ).map(([field, label]) => (
              <label
                key={field}
                className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300"
              >
                <input
                  type="checkbox"
                  checked={Boolean(invoice.pdfOptions[field])}
                  onChange={(e) => updatePdfOption(field, e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Core Invoice Metadata & Client Details Card */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
          <div>
            <label
              htmlFor="inv-number"
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Invoice Number *
            </label>
            <input
              id="inv-number"
              type="text"
              required
              value={invoice.invoiceNumber}
              onChange={(e) => updateField('invoiceNumber', e.target.value)}
              className="w-full px-3 py-2 font-mono font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="inv-issue-date"
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Invoice Date
            </label>
            <input
              id="inv-issue-date"
              type="date"
              value={invoice.issueDate}
              onChange={(e) => updateField('issueDate', e.target.value)}
              className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="inv-due-date"
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Due Date
            </label>
            <input
              id="inv-due-date"
              type="date"
              value={invoice.dueDate}
              onChange={(e) => updateField('dueDate', e.target.value)}
              className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="inv-status"
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Payment Status
            </label>
            <select
              id="inv-status"
              value={invoice.status}
              onChange={(e) =>
                updateField('status', e.target.value as InvoiceStatus)
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="inv-tax-mode"
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              GST Supply Type (Indian GST)
            </label>
            <select
              id="inv-tax-mode"
              value={taxMode}
              onChange={(e) => handleTaxModeChange(e.target.value as TaxMode)}
              className="w-full px-3 py-2 font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              {GST_MODE_OPTIONS.map((tm) => (
                <option key={tm.value} value={tm.value}>
                  {tm.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Client / Buyer Information */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Buyer / Billed-To Details
            </h2>

            <button
              type="button"
              onClick={() => setShowSellerBankPanel((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline self-start sm:self-auto cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              {showSellerBankPanel
                ? 'Hide Seller & Bank Details'
                : `Seller: ${invoice.seller.companyName} (Click to customize)`}
              {showSellerBankPanel ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label
                htmlFor="buyer-company"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Buyer Company Name *
              </label>
              <input
                id="buyer-company"
                type="text"
                placeholder="e.g. Sahyadri Kinetics Pvt. Ltd."
                value={invoice.buyer.companyName}
                onChange={(e) =>
                  updateBuyerField('companyName', e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="buyer-name"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Contact Person
              </label>
              <input
                id="buyer-name"
                type="text"
                placeholder="e.g. Vikram Kulkarni"
                value={invoice.buyer.name}
                onChange={(e) => updateBuyerField('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="buyer-tax-id"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Buyer GSTIN
              </label>
              <input
                id="buyer-tax-id"
                type="text"
                placeholder="e.g. 27AADCS4491K1Z2"
                value={invoice.buyer.taxId}
                onChange={(e) => updateBuyerField('taxId', e.target.value)}
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="inv-po-number"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Purchase Order (PO #)
              </label>
              <input
                id="inv-po-number"
                type="text"
                placeholder="Optional PO Reference"
                value={invoice.purchaseOrderNumber}
                onChange={(e) =>
                  updateField('purchaseOrderNumber', e.target.value)
                }
                className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="buyer-address"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Billing Street Address
              </label>
              <input
                id="buyer-address"
                type="text"
                placeholder="Plot No., MIDC / Industrial Estate, Street"
                value={invoice.buyer.addressLine1}
                onChange={(e) =>
                  updateBuyerField('addressLine1', e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="buyer-city"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                City, State & PIN Code
              </label>
              <input
                id="buyer-city"
                type="text"
                placeholder="Pune, Maharashtra - 410501"
                value={invoice.buyer.cityStatePostal}
                onChange={(e) =>
                  updateBuyerField('cityStatePostal', e.target.value)
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="inv-place-supply"
                className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Place of Supply (State & Code)
              </label>
              <input
                id="inv-place-supply"
                type="text"
                placeholder="e.g. 27 - Maharashtra"
                value={invoice.placeOfSupply}
                onChange={(e) => updateField('placeOfSupply', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Collapsible Seller & Bank Override Section */}
        {showSellerBankPanel && (
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 -mx-5 -mb-5 p-5 rounded-b-xl space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Seller Profile & Remittance Bank (For this invoice)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Seller Company Name
                </label>
                <input
                  type="text"
                  value={invoice.seller.companyName}
                  onChange={(e) =>
                    updateSellerField('companyName', e.target.value)
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Seller GSTIN
                </label>
                <input
                  type="text"
                  value={invoice.seller.taxId}
                  onChange={(e) => updateSellerField('taxId', e.target.value)}
                  className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Seller Address
                </label>
                <input
                  type="text"
                  value={invoice.seller.addressLine1}
                  onChange={(e) =>
                    updateSellerField('addressLine1', e.target.value)
                  }
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bank Name & Branch
                </label>
                <input
                  type="text"
                  value={invoice.bankDetails.bankName}
                  onChange={(e) => updateBankField('bankName', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={invoice.bankDetails.accountNumber}
                  onChange={(e) =>
                    updateBankField('accountNumber', e.target.value)
                  }
                  className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={invoice.bankDetails.routingOrIfsc}
                  onChange={(e) =>
                    updateBankField('routingOrIfsc', e.target.value)
                  }
                  className="w-full px-3 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Line Items, Packaging, Dynamic Inclusive/Exclusive Rates & GST Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Line Items, Packaging & Dynamic GST Pricing (₹)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Type in <strong>Rate (Excl. GST)</strong>, <strong>Rate (Incl. GST)</strong>, <strong>Taxable Value</strong>, or <strong>Total (Incl. GST)</strong> — all related values calculate automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {taxMode === 'CGST_SGST' && (
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncCgstSgst}
                  onChange={(e) => setSyncCgstSgst(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Auto-equalize CGST % = SGST %</span>
              </label>
            )}

            <button
              type="button"
              onClick={handleAddEmptyItem}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Line Item
            </button>
          </div>
        </div>

        {/* Quick-Add Preset Strip */}
        {catalog.length > 0 && (
          <div className="px-5 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap shrink-0">
              <PackagePlus className="w-3.5 h-3.5" />
              Quick Add:
            </span>
            {catalog.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleAddFromCatalog(preset)}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                + {preset.name} ({formatCurrency(preset.unitPrice)})
              </button>
            ))}
          </div>
        )}

        {/* Responsive Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                <th className="py-2.5 px-2.5 min-w-[210px]">Item & HSN/SAC</th>
                <th className="py-2.5 px-1.5 min-w-[146px]">Packaging & Qty</th>
                <th className="py-2.5 px-1.5 min-w-[96px] text-right">
                  Rate (Excl ₹)
                </th>
                <th className="py-2.5 px-1.5 min-w-[96px] text-right">
                  Rate (Incl ₹)
                </th>
                <th className="py-2.5 px-1.5 min-w-[82px] text-right">
                  Pkg / Disc
                </th>
                <th className="py-2.5 px-1.5 min-w-[102px] text-right">
                  Taxable (₹)
                </th>
                {taxMode === 'CGST_SGST' && (
                  <>
                    <th className="py-2.5 px-1.5 min-w-[74px] text-right">
                      CGST %
                    </th>
                    <th className="py-2.5 px-1.5 min-w-[74px] text-right">
                      SGST %
                    </th>
                  </>
                )}
                {taxMode === 'IGST' && (
                  <th className="py-2.5 px-1.5 min-w-[86px] text-right">
                    IGST %
                  </th>
                )}
                <th className="py-2.5 px-2 min-w-[108px] text-right">
                  Total (Incl ₹)
                </th>
                <th className="py-2.5 px-1.5 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {invoice.items.map((item, index) => {
                const calc = summary.lines[item.id];
                return (
                  <tr key={item.id} className="align-top">
                    {/* Item Name, Description & HSN/SAC */}
                    <td className="p-2.5 space-y-1.5">
                      <input
                        type="text"
                        aria-label={`Item ${index + 1} name`}
                        placeholder="Item name..."
                        value={item.name}
                        onChange={(e) =>
                          updateLineItemBasic(item.id, { name: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 font-medium rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          aria-label={`Item ${index + 1} HSN or SAC`}
                          placeholder="HSN/SAC"
                          value={item.skuOrHsn}
                          onChange={(e) =>
                            updateLineItemBasic(item.id, {
                              skuOrHsn: e.target.value,
                            })
                          }
                          className="w-24 shrink-0 px-2 py-1 text-[11px] font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200"
                        />
                        <input
                          type="text"
                          aria-label={`Item ${index + 1} specification`}
                          placeholder="Specs / batch notes..."
                          value={item.description || ''}
                          onChange={(e) =>
                            updateLineItemBasic(item.id, {
                              description: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
                        />
                      </div>
                    </td>

                    {/* Packaging Type, Units/Pkg, Packages, and Total Qty */}
                    <td className="p-2.5 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label={`Item ${index + 1} packaging type`}
                          value={item.packagingType}
                          onChange={(e) =>
                            updateLineItemBasic(item.id, {
                              packagingType: e.target.value as PackagingType,
                            })
                          }
                          className="w-24 px-1.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        >
                          {PACKAGING_OPTIONS.map((pkg) => (
                            <option key={pkg} value={pkg}>
                              {pkg}
                            </option>
                          ))}
                        </select>
                        <div className="flex-1">
                          <DynamicNumberInput
                            min={0}
                            ariaLabel={`Item ${index + 1} total quantity`}
                            value={item.quantity}
                            onChangeValue={(val) =>
                              updateLineItemBasic(item.id, { quantity: val })
                            }
                            className="w-full px-2 py-1.5 text-right font-mono font-semibold tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <span>Pkgs:</span>
                        <DynamicNumberInput
                          min={0}
                          ariaLabel={`Item ${index + 1} package count`}
                          value={item.packageCount}
                          onChangeValue={(val) =>
                            updateLineItemBasic(
                              item.id,
                              { packageCount: val },
                              true
                            )
                          }
                          className="w-12 px-1 py-0.5 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        />
                        <span>×</span>
                        <DynamicNumberInput
                          min={1}
                          ariaLabel={`Item ${index + 1} units per package`}
                          value={item.unitsPerPackage}
                          onChangeValue={(val) =>
                            updateLineItemBasic(
                              item.id,
                              { unitsPerPackage: Math.max(1, val) },
                              true
                            )
                          }
                          className="w-12 px-1 py-0.5 text-right font-mono rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                        />
                        <span>/pkg</span>
                      </div>
                    </td>

                    {/* Unit Rate (Excl. GST) */}
                    <td className="p-2.5">
                      <DynamicNumberInput
                        min={0}
                        ariaLabel={`Item ${index + 1} unit price exclusive of GST`}
                        value={calc?.unitPriceExclusive ?? item.unitPrice}
                        onChangeValue={(val) =>
                          replaceLineItem(item.id, (curr) =>
                            updateItemFromExclusiveRate(curr, val, taxMode)
                          )
                        }
                        className={`w-full px-2 py-1.5 text-right font-mono tabular-nums rounded-md border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${
                          item.priceEntryMode === 'EXCLUSIVE'
                            ? 'border-indigo-400 dark:border-indigo-500'
                            : 'border-slate-300 dark:border-slate-700'
                        }`}
                      />
                      <div className="text-[10px] text-right text-slate-400 mt-1">
                        Excl. GST
                      </div>
                    </td>

                    {/* Unit Rate (Incl. GST) - Dynamic Entry */}
                    <td className="p-2.5">
                      <DynamicNumberInput
                        min={0}
                        ariaLabel={`Item ${index + 1} unit price inclusive of GST`}
                        value={
                          calc?.unitPriceInclusive ??
                          item.unitPriceInclusive ??
                          item.unitPrice
                        }
                        onChangeValue={(val) =>
                          replaceLineItem(item.id, (curr) =>
                            updateItemFromInclusiveRate(curr, val, taxMode)
                          )
                        }
                        className={`w-full px-2 py-1.5 text-right font-mono tabular-nums rounded-md border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 ${
                          item.priceEntryMode === 'INCLUSIVE'
                            ? 'border-indigo-500 ring-1 ring-indigo-500/30'
                            : 'border-slate-300 dark:border-slate-700'
                        }`}
                      />
                      <div className="text-[10px] text-right text-indigo-600 dark:text-indigo-400 mt-1">
                        Incl. GST
                      </div>
                    </td>

                    {/* Pkg Fee /Pkg & Discount % */}
                    <td className="p-2.5 space-y-1">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] text-slate-400">Pkg₹</span>
                        <DynamicNumberInput
                          min={0}
                          ariaLabel={`Item ${index + 1} packaging fee per package`}
                          value={item.packagingCostPerPkg}
                          onChangeValue={(val) =>
                            updateLineItemBasic(item.id, {
                              packagingCostPerPkg: val,
                            })
                          }
                          className="w-16 px-1.5 py-1 text-right font-mono text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] text-slate-400">Disc%</span>
                        <DynamicNumberInput
                          min={0}
                          max={100}
                          ariaLabel={`Item ${index + 1} discount percent`}
                          value={item.discountPercent}
                          onChangeValue={(val) =>
                            updateLineItemBasic(item.id, {
                              discountPercent: val,
                            })
                          }
                          className="w-16 px-1.5 py-1 text-right font-mono text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </td>

                    {/* Taxable Value (₹) - Dynamic Bidirectional Entry */}
                    <td className="p-2.5">
                      <DynamicNumberInput
                        min={0}
                        ariaLabel={`Item ${index + 1} taxable value`}
                        value={calc?.taxableAmount || 0}
                        onChangeValue={(val) =>
                          replaceLineItem(item.id, (curr) =>
                            updateItemFromTaxableValue(curr, val, taxMode)
                          )
                        }
                        className="w-full px-2 py-1.5 text-right font-mono font-semibold tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100"
                      />
                      <div className="text-[10px] text-right text-slate-400 mt-1">
                        Taxable Value
                      </div>
                    </td>

                    {/* Explicit CGST % & SGST % OR IGST % */}
                    {taxMode === 'CGST_SGST' && (
                      <>
                        <td className="p-2.5">
                          <DynamicNumberInput
                            min={0}
                            max={100}
                            ariaLabel={`Item ${index + 1} CGST percent`}
                            value={calc?.effectiveCgstPercent ?? 9}
                            onChangeValue={(val) =>
                              replaceLineItem(item.id, (curr) =>
                                updateItemTaxRates(
                                  curr,
                                  syncCgstSgst
                                    ? { cgstPercent: val, sgstPercent: val }
                                    : { cgstPercent: val },
                                  taxMode
                                )
                              )
                            }
                            className="w-full px-2 py-1.5 text-right font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                          <div className="text-[10px] text-right font-mono text-slate-500 mt-1">
                            {formatCurrency(calc?.cgstAmount || 0)}
                          </div>
                        </td>

                        <td className="p-2.5">
                          <DynamicNumberInput
                            min={0}
                            max={100}
                            ariaLabel={`Item ${index + 1} SGST percent`}
                            value={calc?.effectiveSgstPercent ?? 9}
                            onChangeValue={(val) =>
                              replaceLineItem(item.id, (curr) =>
                                updateItemTaxRates(
                                  curr,
                                  syncCgstSgst
                                    ? { sgstPercent: val, cgstPercent: val }
                                    : { sgstPercent: val },
                                  taxMode
                                )
                              )
                            }
                            className="w-full px-2 py-1.5 text-right font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                          <div className="text-[10px] text-right font-mono text-slate-500 mt-1">
                            {formatCurrency(calc?.sgstAmount || 0)}
                          </div>
                        </td>
                      </>
                    )}

                    {taxMode === 'IGST' && (
                      <td className="p-2.5">
                        <DynamicNumberInput
                          min={0}
                          max={100}
                          ariaLabel={`Item ${index + 1} IGST percent`}
                          value={calc?.effectiveIgstPercent ?? 18}
                          onChangeValue={(val) =>
                            replaceLineItem(item.id, (curr) =>
                              updateItemTaxRates(
                                curr,
                                { igstPercent: val },
                                taxMode
                              )
                            )
                          }
                          className="w-full px-2 py-1.5 text-right font-mono tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        />
                        <div className="text-[10px] text-right font-mono text-slate-500 mt-1">
                          {formatCurrency(calc?.igstAmount || 0)}
                        </div>
                      </td>
                    )}

                    {/* Line Total (Incl. GST ₹) - Dynamic Bidirectional Entry */}
                    <td className="p-2.5">
                      <DynamicNumberInput
                        min={0}
                        ariaLabel={`Item ${index + 1} total amount inclusive of GST`}
                        value={calc?.totalLineAmount || 0}
                        onChangeValue={(val) =>
                          replaceLineItem(item.id, (curr) =>
                            updateItemFromLineTotalInclusive(curr, val, taxMode)
                          )
                        }
                        className="w-full px-2 py-1.5 text-right font-mono font-bold tabular-nums rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      />
                      <div className="text-[10px] text-right text-slate-500 mt-1">
                        Total Incl. GST
                      </div>
                    </td>

                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        aria-label={`Remove line item ${index + 1}`}
                        className="p-1.5 mt-1 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Split: Notes/Terms & Live GST Financial Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 text-xs">
          <div>
            <label
              htmlFor="inv-notes"
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Transport / LR / E-Way Bill & Customer Notes
            </label>
            <textarea
              id="inv-notes"
              rows={2}
              value={invoice.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Vehicle No., E-Way Bill No., Transporter LR details, or dispatch notes..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="inv-terms"
              className="block font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Terms & Conditions
            </label>
            <textarea
              id="inv-terms"
              rows={2}
              value={invoice.termsAndConditions}
              onChange={(e) => updateField('termsAndConditions', e.target.value)}
              placeholder="Payment terms, jurisdiction, warranty disclaimers..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Amount in Words (Indian Rupees)
            </span>
            <p className="text-slate-800 dark:text-slate-200 font-medium mt-0.5">
              {amountToWords(summary.grandTotal)}
            </p>
          </div>
        </div>

        {/* Financial Totals Card */}
        <div className="lg:col-span-5 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>
              Total Packages:{' '}
              <strong className="font-mono text-slate-800 dark:text-slate-200">
                {summary.totalPackages}
              </strong>
            </span>
            <span>
              Total Units:{' '}
              <strong className="font-mono text-slate-800 dark:text-slate-200">
                {summary.totalUnits}
              </strong>
            </span>
          </div>

          <div className="space-y-2 font-mono tabular-nums">
            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">Merchandise Subtotal</span>
              <span>{formatCurrency(summary.merchandiseSubtotal)}</span>
            </div>

            <div className="flex justify-between text-slate-600 dark:text-slate-300">
              <span className="font-sans">Packaging Charges</span>
              <span>{formatCurrency(summary.packagingSubtotal)}</span>
            </div>

            {summary.itemDiscountTotal > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span className="font-sans">Line Item Discounts</span>
                <span>-{formatCurrency(summary.itemDiscountTotal)}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
              <label htmlFor="inv-extra-discount" className="font-sans">
                Additional Invoice Discount (₹)
              </label>
              <input
                id="inv-extra-discount"
                type="number"
                min="0"
                step="0.01"
                value={invoice.additionalDiscountAmount}
                onChange={(e) =>
                  updateField(
                    'additionalDiscountAmount',
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
                className="w-28 px-2 py-1 text-right font-mono rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200">
              <span className="font-sans">Total Taxable Value</span>
              <span>{formatCurrency(summary.taxableSubtotal)}</span>
            </div>

            {taxMode === 'CGST_SGST' ? (
              <>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="font-sans">Total CGST</span>
                  <span>{formatCurrency(summary.cgstTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="font-sans">Total SGST</span>
                  <span>{formatCurrency(summary.sgstTotal)}</span>
                </div>
              </>
            ) : (
              taxMode === 'IGST' && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span className="font-sans">Total IGST</span>
                  <span>{formatCurrency(summary.igstTotal)}</span>
                </div>
              )
            )}

            <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
              <label htmlFor="inv-shipping" className="font-sans">
                Freight & Forwarding Charges (₹)
              </label>
              <input
                id="inv-shipping"
                type="number"
                min="0"
                step="0.01"
                value={invoice.shippingAndHandling}
                onChange={(e) =>
                  updateField(
                    'shippingAndHandling',
                    Math.max(0, Number(e.target.value) || 0)
                  )
                }
                className="w-28 px-2 py-1 text-right font-mono rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="inline-flex items-center gap-2 font-sans text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={invoice.roundOff}
                  onChange={(e) => updateField('roundOff', e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Round off Grand Total (₹)</span>
              </label>
              {invoice.roundOff && (
                <span className="text-slate-500">
                  {formatCurrency(summary.roundOffAdjustment)}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-slate-900 dark:border-slate-100 text-base font-bold text-slate-900 dark:text-slate-100">
              <span className="font-sans">Grand Total (INR)</span>
              <span>{formatCurrency(summary.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
