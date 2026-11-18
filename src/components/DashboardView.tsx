import React, { useState } from 'react';
import {
  Search,
  Plus,
  FileDown,
  Pencil,
  Trash2,
  Copy,
  Calendar,
  SlidersHorizontal,
  ArrowUpDown,
  Database,
  Check,
} from 'lucide-react';
import {
  DashboardFilters,
  DateFilterPreset,
  Invoice,
  InvoiceStatus,
} from '../types/billing';
import {
  calculateInvoiceSummary,
  filterAndSortInvoices,
  formatCurrency,
  formatTaxModeLabel,
} from '../utils/billing';

interface DashboardViewProps {
  invoices: Invoice[];
  filters: DashboardFilters;
  onUpdateFilters: (next: Partial<DashboardFilters>) => void;
  onCreateNew: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onOpenPdfPreview: (invoice: Invoice) => void;
  onDuplicateInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onStatusChange: (invoiceId: string, status: InvoiceStatus) => void;
  onOpenDataModal: () => void;
}

const STATUS_TABS: Array<'All' | InvoiceStatus> = [
  'All',
  'Paid',
  'Pending',
  'Overdue',
  'Draft',
];

const DATE_PRESETS: Array<{ id: DateFilterPreset; label: string }> = [
  { id: 'all', label: 'All Dates' },
  { id: 'today', label: 'Today' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'last30', label: 'Last 30 Days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  invoices,
  filters,
  onUpdateFilters,
  onCreateNew,
  onEditInvoice,
  onOpenPdfPreview,
  onDuplicateInvoice,
  onDeleteInvoice,
  onStatusChange,
  onOpenDataModal,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredInvoices = filterAndSortInvoices(invoices, filters);

  // Calculate aggregate KPIs across all invoices
  let totalVolume = 0;
  let paidTotal = 0;
  let pendingTotal = 0;
  let overdueTotal = 0;

  for (const inv of invoices) {
    const { grandTotal } = calculateInvoiceSummary(inv);
    totalVolume += grandTotal;
    if (inv.status === 'Paid') paidTotal += grandTotal;
    if (inv.status === 'Pending') pendingTotal += grandTotal;
    if (inv.status === 'Overdue') overdueTotal += grandTotal;
  }

  const primaryCurrency = invoices[0]?.currency || 'USD';

  const getStatusTextColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'Paid':
        return 'text-emerald-700 dark:text-emerald-400';
      case 'Pending':
        return 'text-amber-700 dark:text-amber-400';
      case 'Overdue':
        return 'text-red-700 dark:text-red-400';
      case 'Draft':
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Tax Invoices & Billing Ledger
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Create itemized tax invoices with packaging breakdowns, export print-ready PDFs, and manage archives.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenDataModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5" />
            JSON Backup & Defaults
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Tax Invoice
          </button>
        </div>
      </div>

      {/* 4-Column Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Billed Volume
          </p>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(totalVolume, primaryCurrency)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {invoices.length} total invoice{invoices.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Collected Revenue (Paid)
          </p>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(paidTotal, primaryCurrency)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {invoices.filter((i) => i.status === 'Paid').length} settled
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Pending Receivables
          </p>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
            {formatCurrency(pendingTotal, primaryCurrency)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {invoices.filter((i) => i.status === 'Pending').length} awaiting payment
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Overdue Balance
          </p>
          <p className="mt-1.5 text-2xl font-bold font-mono tabular-nums text-red-700 dark:text-red-400">
            {formatCurrency(overdueTotal, primaryCurrency)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {invoices.filter((i) => i.status === 'Overdue').length} past due date
          </p>
        </div>
      </div>

      {/* Search, Date Filter & Status Filter Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search invoices by number, client, tax ID, or item"
              placeholder="Search invoice #, client company, GSTIN/Tax ID, PO #, or item..."
              value={filters.searchQuery}
              onChange={(e) => onUpdateFilters({ searchQuery: e.target.value })}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Interactive Status Filter Segmented Control */}
          <div
            className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-x-auto"
            role="group"
            aria-label="Filter invoices by status"
          >
            {STATUS_TABS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onUpdateFilters({ status })}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filters.status === status
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Second Toolbar Row: Date Range Presets + Custom Date Inputs + Sort Order */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium mr-1">
              <Calendar className="w-3.5 h-3.5" />
              Issue Date:
            </span>
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onUpdateFilters({ datePreset: preset.id })}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filters.datePreset === preset.id
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}

            {filters.datePreset === 'custom' && (
              <div className="flex items-center gap-2 ml-1">
                <input
                  type="date"
                  aria-label="Filter from date"
                  value={filters.dateFrom}
                  onChange={(e) => onUpdateFilters({ dateFrom: e.target.value })}
                  className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  aria-label="Filter to date"
                  value={filters.dateTo}
                  onChange={(e) => onUpdateFilters({ dateTo: e.target.value })}
                  className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <label htmlFor="sort-invoices" className="text-slate-500 dark:text-slate-400">
              Sort:
            </label>
            <select
              id="sort-invoices"
              value={filters.sortBy}
              onChange={(e) =>
                onUpdateFilters({
                  sortBy: e.target.value as DashboardFilters['sortBy'],
                })
              }
              className="px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
            >
              <option value="dateDesc">Issue Date (Newest)</option>
              <option value="dateAsc">Issue Date (Oldest)</option>
              <option value="amountDesc">Total Amount (High → Low)</option>
              <option value="amountAsc">Total Amount (Low → High)</option>
              <option value="numberAsc">Invoice Number</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
              No matching tax invoices found
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {invoices.length === 0
                ? 'Your billing ledger is empty. Create your first tax invoice or import an existing JSON backup.'
                : 'No bills match your current search or date filters. Try clearing the search query or switching to All Dates.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {invoices.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateFilters({
                      searchQuery: '',
                      status: 'All',
                      datePreset: 'all',
                      dateFrom: '',
                      dateTo: '',
                    })
                  }
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
              <button
                type="button"
                onClick={onCreateNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Tax Invoice
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Client / Buyer</th>
                  <th className="py-3 px-4">Issue & Due</th>
                  <th className="py-3 px-4">Packaging & Items</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                {filteredInvoices.map((inv) => {
                  const summary = calculateInvoiceSummary(inv);
                  const isConfirmingDelete = confirmDeleteId === inv.id;

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 align-middle">
                        <button
                          type="button"
                          onClick={() => onEditInvoice(inv)}
                          className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline text-left cursor-pointer"
                        >
                          {inv.invoiceNumber}
                        </button>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {formatTaxModeLabel(inv.taxMode)}
                          {inv.purchaseOrderNumber
                            ? ` · ${inv.purchaseOrderNumber}`
                            : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {inv.buyer.companyName || inv.buyer.name || 'Unnamed Client'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {[inv.buyer.name, inv.buyer.cityStatePostal]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle font-mono tabular-nums whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200">
                          {inv.issueDate}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Due {inv.dueDate}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200 font-mono tabular-nums">
                          {inv.items.length} item{inv.items.length === 1 ? '' : 's'} ·{' '}
                          {summary.totalPackages} pkg
                          {summary.totalPackages === 1 ? '' : 's'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                          {summary.totalUnits} total units
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <select
                          aria-label={`Status for ${inv.invoiceNumber}`}
                          value={inv.status}
                          onChange={(e) =>
                            onStatusChange(
                              inv.id,
                              e.target.value as InvoiceStatus
                            )
                          }
                          className={`bg-transparent font-semibold text-xs focus:outline-none cursor-pointer ${getStatusTextColor(
                            inv.status
                          )}`}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Pending">Pending</option>
                          <option value="Overdue">Overdue</option>
                          <option value="Draft">Draft</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 align-middle text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {formatCurrency(summary.grandTotal, inv.currency)}
                        </div>
                        {summary.totalTax > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            incl. {formatCurrency(summary.totalTax, inv.currency)} GST
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-middle text-right">
                        {isConfirmingDelete ? (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteInvoice(inv.id);
                                setConfirmDeleteId(null);
                              }}
                              aria-label={`Confirm delete ${inv.invoiceNumber}`}
                              className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors cursor-pointer"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenPdfPreview(inv)}
                              aria-label={`Export PDF for ${inv.invoiceNumber}`}
                              title="Preview & Export PDF"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            >
                              <FileDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span className="hidden xl:inline">PDF</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onEditInvoice(inv)}
                              aria-label={`Edit ${inv.invoiceNumber}`}
                              title="Edit Invoice"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onDuplicateInvoice(inv)}
                              aria-label={`Duplicate ${inv.invoiceNumber}`}
                              title="Duplicate Invoice"
                              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(inv.id)}
                              aria-label={`Delete ${inv.invoiceNumber}`}
                              title="Delete Invoice"
                              className="p-1.5 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
