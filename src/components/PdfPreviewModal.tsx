import React, { useRef, useState } from 'react';
import {
  Download,
  SlidersHorizontal,
  X,
  Check,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { Invoice, PdfPageOptions } from '../types/billing';
import {
  amountToWords,
  calculateInvoiceSummary,
  formatBuyerDisplayName,
  formatCurrency,
  formatPaymentMethodSummary,
  getItemNameTypography,
  normalizeTaxMode,
  processSellerLogoFile,
} from '../utils/billing';
import { exportInvoiceToPdf } from '../utils/pdfGenerator';

interface PdfPreviewModalProps {
  invoice: Invoice;
  onClose: () => void;
  onUpdateInvoiceOptions?: (invoiceId: string, updatedOptions: PdfPageOptions) => void;
  onUpdateSellerLogo?: (invoiceId: string, logoDataUrl: string) => void;
}

const ACCENT_HEX: Record<PdfPageOptions['accentColor'], string> = {
  slate: '#18181b',
  indigo: '#3730a3',
  emerald: '#065f46',
  amber: '#92400e',
  crimson: '#991b1b',
};

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  invoice,
  onClose,
  onUpdateInvoiceOptions,
  onUpdateSellerLogo,
}) => {
  const [options, setOptions] = useState<PdfPageOptions>({
    ...invoice.pdfOptions,
    showSellerLogo: invoice.pdfOptions?.showSellerLogo ?? true,
  });
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [downloadedFeedback, setDownloadedFeedback] = useState(false);
  const [logoFeedback, setLogoFeedback] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const taxMode = normalizeTaxMode(invoice.taxMode);
  const summary = calculateInvoiceSummary(invoice);
  const accentColorHex = ACCENT_HEX[options.accentColor] || ACCENT_HEX.slate;
  const paymentSummary = formatPaymentMethodSummary(invoice);

  const updateOption = <K extends keyof PdfPageOptions>(
    key: K,
    value: PdfPageOptions[K]
  ) => {
    const next = { ...options, [key]: value };
    setOptions(next);
    if (onUpdateInvoiceOptions) {
      onUpdateInvoiceOptions(invoice.id, next);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const squareDataUrl = await processSellerLogoFile(file, 512);
      if (onUpdateSellerLogo) {
        onUpdateSellerLogo(invoice.id, squareDataUrl);
      }
      updateOption('showSellerLogo', true);
      setLogoFeedback('512×512 square logo applied');
      setTimeout(() => setLogoFeedback(null), 3000);
    } catch {
      setLogoFeedback('Failed to process image');
    } finally {
      e.target.value = '';
    }
  };

  const handleDownloadPdf = () => {
    exportInvoiceToPdf(invoice, options);
    setDownloadedFeedback(true);
    setTimeout(() => setDownloadedFeedback(false), 2500);
  };

  const paddingClass =
    options.marginPreset === 'compact'
      ? 'p-5 sm:p-6'
      : options.marginPreset === 'wide'
      ? 'p-8 sm:p-12'
      : 'p-6 sm:p-9';

  const showLogo = Boolean((options.showSellerLogo ?? true) && invoice.seller.logoDataUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Export PDF for ${invoice.invoiceNumber}`}
    >
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadLogo}
        className="hidden"
        aria-label="Upload seller logo for PDF"
      />

      <div className="relative flex flex-col w-full max-w-6xl h-[92vh] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#2a2a2e] rounded-xl shadow-2xl overflow-hidden">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-zinc-200 dark:border-[#2a2a2e] bg-zinc-50/90 dark:bg-[#18181b]">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              GST Tax Invoice PDF Preview — {invoice.invoiceNumber}
            </h2>
            <span className="hidden sm:inline-block text-xs text-zinc-500 dark:text-zinc-400">
              · {options.paperSize.toUpperCase()} ·{' '}
              {options.orientation === 'portrait' ? 'Portrait' : 'Landscape'} · IBM Plex Serif
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowSettingsDrawer((prev) => !prev)}
              aria-expanded={showSettingsDrawer}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                showSettingsDrawer
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100'
                  : 'bg-white dark:bg-[#222226] text-zinc-700 dark:text-zinc-200 border-zinc-300 dark:border-[#323238] hover:bg-zinc-100 dark:hover:bg-[#2a2a2f]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Page & Layout Options
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {downloadedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  PDF Exported
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close PDF preview"
              className="p-2 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-[#26262a] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Workspace Content: Live Sheet + Optional Tucked-Away Page Options Drawer */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Sheet Preview Area — Exclusively IBM Plex Serif */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-100/90 dark:bg-[#111113] flex justify-center items-start">
            <div
              style={{ fontFamily: "'IBM Plex Serif', Georgia, serif" }}
              className={`font-pdf bg-white text-zinc-900 shadow-lg border border-zinc-200 transition-all duration-150 ${paddingClass} ${
                options.orientation === 'landscape'
                  ? 'w-full max-w-[1040px] min-h-[640px]'
                  : 'w-full max-w-[850px] min-h-[960px]'
              }`}
            >
              {/* Top Accent Bar */}
              <div
                className="h-1.5 w-full mb-6"
                style={{ backgroundColor: accentColorHex }}
              />

              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-zinc-200">
                <div className="flex items-start gap-4">
                  {showLogo && invoice.seller.logoDataUrl && (
                    <img
                      src={invoice.seller.logoDataUrl}
                      alt={`${invoice.seller.companyName || 'Seller'} logo`}
                      className="w-16 h-16 object-contain shrink-0 rounded-xs"
                    />
                  )}
                  <div>
                    <h1
                      className="text-xl font-bold tracking-tight"
                      style={{ color: accentColorHex }}
                    >
                      {invoice.seller.companyName || 'Seller Company'}
                    </h1>
                    <div className="mt-1.5 text-xs text-zinc-600 space-y-0.5">
                      {invoice.seller.addressLine1 && <p>{invoice.seller.addressLine1}</p>}
                      {invoice.seller.cityStatePostal && (
                        <p>{invoice.seller.cityStatePostal}</p>
                      )}
                      {invoice.seller.taxId && (
                        <p className="text-[11px] font-semibold text-zinc-800">
                          GSTIN: {invoice.seller.taxId}
                        </p>
                      )}
                      <p>
                        {[invoice.seller.email, invoice.seller.phone]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="sm:text-right">
                  <div
                    className="text-base font-bold tracking-wider uppercase"
                    style={{ color: accentColorHex }}
                  >
                    {options.headerTitle || 'TAX INVOICE'}
                  </div>
                  <div className="mt-1.5 text-xs text-zinc-600 space-y-0.5 tabular-nums">
                    <p className="font-semibold text-zinc-900">
                      {invoice.invoiceNumber}
                    </p>
                    <p>Invoice Date: {invoice.issueDate}</p>
                    {invoice.status === 'Paid' && invoice.paymentDate && (
                      <p>Payment Date: {invoice.paymentDate}</p>
                    )}
                    {invoice.status !== 'Paid' && invoice.dueDate && (
                      <p>Due Date: {invoice.dueDate}</p>
                    )}
                    {invoice.purchaseOrderNumber && !invoice.isCashCustomer && (
                      <p>PO Ref: {invoice.purchaseOrderNumber}</p>
                    )}
                    {invoice.placeOfSupply && (
                      <p>Place of Supply: {invoice.placeOfSupply}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Parties & Consignment Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-5 border-b border-zinc-200 text-xs">
                <div>
                  <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Billed To (Buyer)
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">
                    {formatBuyerDisplayName(invoice)}
                  </p>
                  {!invoice.isCashCustomer && (
                    <>
                      {invoice.buyer.name && invoice.buyer.companyName && (
                        <p className="text-zinc-600">Attn: {invoice.buyer.name}</p>
                      )}
                      <p className="text-zinc-600">{invoice.buyer.addressLine1}</p>
                      <p className="text-zinc-600">{invoice.buyer.cityStatePostal}</p>
                      {invoice.buyer.taxId && (
                        <p className="text-[11px] font-semibold text-zinc-800 mt-1">
                          GSTIN: {invoice.buyer.taxId}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="sm:border-l sm:border-zinc-200 sm:pl-6 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      Consignment & GST Summary
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-1.5 text-zinc-700">
                      <div>
                        <span className="text-zinc-500">Line Items:</span>{' '}
                        <span className="font-semibold tabular-nums">
                          {invoice.items.length}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Total Qty:</span>{' '}
                        <span className="font-semibold tabular-nums">
                          {summary.totalUnits}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">GST Regime:</span>{' '}
                        <span className="font-semibold">
                          {taxMode === 'CGST_SGST'
                            ? 'CGST + SGST'
                            : taxMode === 'IGST'
                            ? 'IGST'
                            : 'Exempt'}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500">Payment Status:</span>{' '}
                        <span className="font-semibold">{invoice.status}</span>
                      </div>
                      {paymentSummary && (
                        <div className="col-span-2">
                          <span className="text-zinc-500">Payment Method:</span>{' '}
                          <span className="font-semibold">{paymentSummary}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-zinc-100 text-zinc-700 border-y border-zinc-200 whitespace-nowrap">
                      <th className="py-2 px-1.5 font-semibold w-6">#</th>
                      <th className="py-2 px-1.5 font-semibold">Item Description</th>
                      {options.showSkuColumn && (
                        <th className="py-2 px-1.5 font-semibold">HSN/SAC</th>
                      )}
                      {options.showPackagingColumn && (
                        <th className="py-2 px-1.5 font-semibold">Packaging</th>
                      )}
                      <th className="py-2 px-1.5 font-semibold text-right">Qty</th>
                      <th className="py-2 px-1.5 font-semibold text-right">Rate (Excl)</th>
                      {options.showDiscountColumn && (
                        <th className="py-2 px-1.5 font-semibold text-right">Discount</th>
                      )}
                      <th className="py-2 px-1.5 font-semibold text-right">Taxable Val</th>
                      {taxMode === 'CGST_SGST' && (
                        <>
                          <th className="py-2 px-1.5 font-semibold text-right">CGST</th>
                          <th className="py-2 px-1.5 font-semibold text-right">SGST</th>
                        </>
                      )}
                      {taxMode === 'IGST' && (
                        <th className="py-2 px-1.5 font-semibold text-right">IGST</th>
                      )}
                      <th className="py-2 px-1.5 font-semibold text-right">Total (Incl)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {invoice.items.map((item, idx) => {
                      const calc = summary.lines[item.id];
                      const nameTypo = getItemNameTypography(item.name);
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="py-2.5 px-1.5 text-zinc-500 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-1.5 max-w-[210px] whitespace-normal break-words">
                            <div
                              className={`font-semibold text-zinc-900 ${nameTypo.previewFontClass}`}
                            >
                              {item.name}
                            </div>
                            {item.description && (
                              <div className="text-[10px] leading-snug text-zinc-500 mt-0.5 whitespace-normal break-words">
                                {item.description}
                              </div>
                            )}
                          </td>
                          {options.showSkuColumn && (
                            <td className="py-2.5 px-1.5 text-zinc-600 tabular-nums whitespace-nowrap">
                              {item.skuOrHsn || '—'}
                            </td>
                          )}
                          {options.showPackagingColumn && (
                            <td className="py-2.5 px-1.5 text-zinc-600 whitespace-nowrap">
                              {item.packagingType}
                            </td>
                          )}
                          <td className="py-2.5 px-1.5 text-right tabular-nums whitespace-nowrap">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-1.5 text-right tabular-nums whitespace-nowrap">
                            <div>{formatCurrency(calc?.unitPriceExclusive || 0)}</div>
                            <div className="text-[10px] text-zinc-400">
                              Incl: {formatCurrency(calc?.unitPriceInclusive || 0)}
                            </div>
                          </td>
                          {options.showDiscountColumn && (
                            <td className="py-2.5 px-1.5 text-right tabular-nums text-zinc-600 whitespace-nowrap">
                              {(calc?.preTaxDiscountAmount || 0) > 0
                                ? `-${formatCurrency(calc?.preTaxDiscountAmount || 0)}`
                                : '—'}
                            </td>
                          )}
                          <td className="py-2.5 px-1.5 text-right tabular-nums font-medium text-zinc-800 whitespace-nowrap">
                            {formatCurrency(calc?.taxableAmount || 0)}
                          </td>
                          {taxMode === 'CGST_SGST' && (
                            <>
                              <td className="py-2.5 px-1.5 text-right tabular-nums text-zinc-600 whitespace-nowrap">
                                <div>{formatCurrency(calc?.cgstAmount || 0)}</div>
                                <div className="text-[10px] text-zinc-400">
                                  @{calc?.effectiveCgstPercent || 0}%
                                </div>
                              </td>
                              <td className="py-2.5 px-1.5 text-right tabular-nums text-zinc-600 whitespace-nowrap">
                                <div>{formatCurrency(calc?.sgstAmount || 0)}</div>
                                <div className="text-[10px] text-zinc-400">
                                  @{calc?.effectiveSgstPercent || 0}%
                                </div>
                              </td>
                            </>
                          )}
                          {taxMode === 'IGST' && (
                            <td className="py-2.5 px-1.5 text-right tabular-nums text-zinc-600 whitespace-nowrap">
                              <div>{formatCurrency(calc?.igstAmount || 0)}</div>
                              <div className="text-[10px] text-zinc-400">
                                @{calc?.effectiveIgstPercent || 0}%
                              </div>
                            </td>
                          )}
                          <td className="py-2.5 px-1.5 text-right font-semibold tabular-nums text-zinc-900 whitespace-nowrap">
                            {formatCurrency(calc?.totalLineAmount || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Lower Summary & Breakdown */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-6 pt-4 border-t border-zinc-200 text-xs">
                <div className="sm:col-span-7 space-y-4">
                  {options.showAmountInWords && (
                    <div>
                      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Amount in Words (INR)
                      </p>
                      <p className="text-zinc-800 font-medium mt-0.5">
                        {amountToWords(summary.grandTotal)}
                      </p>
                    </div>
                  )}

                  {options.showTaxBreakdown &&
                    taxMode !== 'EXEMPT' &&
                    summary.taxSlabBreakdown.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                          GST Slab Summary
                        </p>
                        <div className="space-y-1 text-[11px] text-zinc-600 tabular-nums">
                          {summary.taxSlabBreakdown.map((slab, idx) => (
                            <div key={idx}>
                              Taxable {formatCurrency(slab.taxableAmount)}:{' '}
                              {taxMode === 'CGST_SGST'
                                ? `CGST @${slab.cgstRate}% (${formatCurrency(
                                    slab.cgst
                                  )}) + SGST @${slab.sgstRate}% (${formatCurrency(
                                    slab.sgst
                                  )})`
                                : `IGST @${slab.igstRate}% (${formatCurrency(
                                    slab.igst
                                  )})`}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {options.showBankDetails && invoice.bankDetails.bankName && (
                    <div>
                      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                        Bank & NEFT / RTGS Remittance
                      </p>
                      <div className="text-zinc-600 space-y-0.5">
                        <p className="font-medium text-zinc-800">
                          {[
                            invoice.bankDetails.bankName,
                            invoice.bankDetails.accountName,
                          ]
                            .filter(Boolean)
                            .join(' — ')}
                        </p>
                        <p className="text-[11px] tabular-nums">
                          A/C No: {invoice.bankDetails.accountNumber} · IFSC:{' '}
                          {invoice.bankDetails.routingOrIfsc}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Totals Column */}
                <div className="sm:col-span-5 space-y-2 tabular-nums">
                  <div className="flex justify-between text-zinc-800 font-semibold">
                    <span>Subtotal</span>
                    <span>{formatCurrency(summary.lineTaxableSubtotal)}</span>
                  </div>
                  {summary.additionalPreTaxDiscountAmount > 0 && (
                    <>
                      <div className="flex justify-between text-zinc-600">
                        <span>Additional Invoice Discount</span>
                        <span>
                          -{formatCurrency(summary.additionalPreTaxDiscountAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-800 font-medium pt-1 border-t border-zinc-200">
                        <span>Total Taxable Value</span>
                        <span>{formatCurrency(summary.taxableSubtotal)}</span>
                      </div>
                    </>
                  )}
                  {taxMode === 'CGST_SGST' ? (
                    <>
                      <div className="flex justify-between text-zinc-600">
                        <span>Total CGST</span>
                        <span>{formatCurrency(summary.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600">
                        <span>Total SGST</span>
                        <span>{formatCurrency(summary.sgstTotal)}</span>
                      </div>
                    </>
                  ) : (
                    taxMode === 'IGST' && (
                      <div className="flex justify-between text-zinc-600">
                        <span>Total IGST</span>
                        <span>{formatCurrency(summary.igstTotal)}</span>
                      </div>
                    )
                  )}
                  {invoice.roundOff && summary.roundOffAdjustment !== 0 && (
                    <div className="flex justify-between text-zinc-500">
                      <span>Round Off</span>
                      <span>{formatCurrency(summary.roundOffAdjustment)}</span>
                    </div>
                  )}
                  <div
                    className="flex justify-between text-sm font-bold pt-2 border-t-2 text-zinc-900"
                    style={{ borderColor: accentColorHex }}
                  >
                    <span>Grand Total</span>
                    <span>{formatCurrency(summary.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Signature Footer */}
              <div className="mt-8 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
                <div className="max-w-md space-y-1 text-zinc-600">
                  {invoice.notes && (
                    <p>
                      <span className="font-semibold text-zinc-700">Notes: </span>
                      {invoice.notes}
                    </p>
                  )}
                  {invoice.termsAndConditions && (
                    <p>
                      <span className="font-semibold text-zinc-700">Terms: </span>
                      {invoice.termsAndConditions}
                    </p>
                  )}
                </div>

                {options.showSignatureBlock && (
                  <div className="text-right shrink-0 pt-6">
                    <div className="w-44 border-b border-zinc-400 mb-1.5" />
                    <p className="font-semibold text-zinc-800">
                      {options.signatoryLabel || 'Authorized Signatory'}
                    </p>
                    {invoice.seller.companyName && (
                      <p className="text-[11px] text-zinc-500">
                        For {invoice.seller.companyName}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {options.footerNote && (
                <p className="mt-8 text-center text-[11px] text-zinc-400">
                  {options.footerNote}
                </p>
              )}
            </div>
          </div>

          {/* Collapsible Page Settings Sidebar */}
          {showSettingsDrawer && (
            <aside className="w-80 shrink-0 border-l border-zinc-200 dark:border-[#2a2a2e] bg-white dark:bg-[#18181b] overflow-y-auto p-5 space-y-5 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  PDF Page & Layout Settings
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSettingsDrawer(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Hide
                </button>
              </div>

              {/* Seller Logo Controls in PDF Sidebar */}
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-[#2a2a2e] bg-zinc-50/70 dark:bg-[#202024] space-y-2.5">
                <div className="flex items-center gap-2.5">
                  {invoice.seller.logoDataUrl ? (
                    <img
                      src={invoice.seller.logoDataUrl}
                      alt="Seller logo thumbnail"
                      className="w-10 h-10 rounded border border-zinc-200 dark:border-[#323238] object-contain bg-white p-0.5 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded border border-dashed border-zinc-300 dark:border-[#323238] flex items-center justify-center text-zinc-400 shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      Seller Logo (512×512px)
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Auto-squared & downscaled to 512px
                    </p>
                  </div>
                </div>
                {logoFeedback && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {logoFeedback}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-zinc-800 dark:text-zinc-100 bg-white dark:bg-[#27272c] border border-zinc-300 dark:border-[#36363d] rounded-md hover:bg-zinc-100 dark:hover:bg-[#303036] transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {invoice.seller.logoDataUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  {invoice.seller.logoDataUrl && onUpdateSellerLogo && (
                    <button
                      type="button"
                      onClick={() => onUpdateSellerLogo(invoice.id, '')}
                      className="px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="pdf-header-title"
                    className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Document Header Title
                  </label>
                  <input
                    id="pdf-header-title"
                    type="text"
                    value={options.headerTitle}
                    onChange={(e) => updateOption('headerTitle', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label
                      htmlFor="pdf-paper-size"
                      className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                    >
                      Paper Size
                    </label>
                    <select
                      id="pdf-paper-size"
                      value={options.paperSize}
                      onChange={(e) =>
                        updateOption(
                          'paperSize',
                          e.target.value as PdfPageOptions['paperSize']
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="a4">A4 (210 × 297 mm)</option>
                      <option value="letter">US Letter</option>
                      <option value="legal">Legal</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="pdf-orientation"
                      className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                    >
                      Orientation
                    </label>
                    <select
                      id="pdf-orientation"
                      value={options.orientation}
                      onChange={(e) =>
                        updateOption(
                          'orientation',
                          e.target.value as PdfPageOptions['orientation']
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="pdf-margins"
                    className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Page Margin Density
                  </label>
                  <select
                    id="pdf-margins"
                    value={options.marginPreset}
                    onChange={(e) =>
                      updateOption(
                        'marginPreset',
                        e.target.value as PdfPageOptions['marginPreset']
                      )
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="compact">Compact (10mm)</option>
                    <option value="standard">Standard (15mm)</option>
                    <option value="wide">Wide Executive (22mm)</option>
                  </select>
                </div>

                <div>
                  <span className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Invoice Accent Color
                  </span>
                  <div className="flex items-center gap-2">
                    {(
                      ['slate', 'indigo', 'emerald', 'amber', 'crimson'] as const
                    ).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateOption('accentColor', color)}
                        aria-label={`Accent color ${color}`}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                          options.accentColor === color
                            ? 'scale-110 border-zinc-900 dark:border-white'
                            : 'border-transparent opacity-75 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: ACCENT_HEX[color] }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-[#2a2a2e] space-y-2.5">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Visible Columns & Blocks
                </p>

                {(
                  [
                    ['showSellerLogo', 'Show Seller Logo'],
                    ['showSkuColumn', 'Show HSN / SAC Column'],
                    ['showPackagingColumn', 'Show Packaging Column'],
                    ['showDiscountColumn', 'Show Discount Column'],
                    ['showTaxBreakdown', 'Show GST Slab Summary'],
                    ['showAmountInWords', 'Show Amount in Words'],
                    ['showBankDetails', 'Show Bank & IFSC Details'],
                    ['showSignatureBlock', 'Show Signatory Block'],
                  ] as const
                ).map(([field, label]) => (
                  <label
                    key={field}
                    className="flex items-center justify-between gap-2 py-1 cursor-pointer text-zinc-700 dark:text-zinc-300"
                  >
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(options[field] ?? true)}
                      onChange={(e) => updateOption(field, e.target.checked)}
                      className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                    />
                  </label>
                ))}
              </div>

              <div className="pt-3 border-t border-zinc-200 dark:border-[#2a2a2e] space-y-3">
                <div>
                  <label
                    htmlFor="pdf-signatory"
                    className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Signatory Caption
                  </label>
                  <input
                    id="pdf-signatory"
                    type="text"
                    value={options.signatoryLabel}
                    onChange={(e) => updateOption('signatoryLabel', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="pdf-footer-note"
                    className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Bottom Page Footer Note
                  </label>
                  <textarea
                    id="pdf-footer-note"
                    rows={2}
                    value={options.footerNote}
                    onChange={(e) => updateOption('footerNote', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
