/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Sun, Moon, Plus } from 'lucide-react';
import {
  BankDetails,
  BilluminatiBackup,
  CatalogItem,
  DashboardFilters,
  Invoice,
  InvoiceStatus,
  PartyDetails,
  PdfPageOptions,
} from './types/billing';
import {
  DEFAULT_BANK,
  DEFAULT_PDF_OPTIONS,
  DEFAULT_SELLER,
  INITIAL_CATALOG,
  INITIAL_INVOICES,
} from './data/seedData';
import {
  generateNextInvoiceNumber,
  normalizeInvoiceRecord,
} from './utils/billing';
import { DashboardView } from './components/DashboardView';
import { InvoiceEditorView } from './components/InvoiceEditorView';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { DataSettingsModal } from './components/DataSettingsModal';

const STORAGE_KEYS = {
  INVOICES: 'billuminati_invoices_inr_v2',
  SELLER: 'billuminati_default_seller_inr_v2',
  BANK: 'billuminati_default_bank_inr_v2',
  PDF_OPTS: 'billuminati_default_pdf_inr_v2',
  CATALOG: 'billuminati_catalog_inr_v2',
  THEME: 'billuminati_theme_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    loadFromStorage(STORAGE_KEYS.THEME, 'light')
  );

  const [invoices, setInvoices] = useState<Invoice[]>(() =>
    loadFromStorage(STORAGE_KEYS.INVOICES, INITIAL_INVOICES).map(
      normalizeInvoiceRecord
    )
  );

  const [defaultSeller, setDefaultSeller] = useState<PartyDetails>(() =>
    loadFromStorage(STORAGE_KEYS.SELLER, DEFAULT_SELLER)
  );

  const [defaultBank, setDefaultBank] = useState<BankDetails>(() =>
    loadFromStorage(STORAGE_KEYS.BANK, DEFAULT_BANK)
  );

  const [defaultPdfOptions] = useState<PdfPageOptions>(() =>
    loadFromStorage(STORAGE_KEYS.PDF_OPTS, DEFAULT_PDF_OPTIONS)
  );

  const [catalog, setCatalog] = useState<CatalogItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.CATALOG, INITIAL_CATALOG)
  );

  const [activeView, setActiveView] = useState<'dashboard' | 'editor'>('dashboard');
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const [pdfPreviewInvoice, setPdfPreviewInvoice] = useState<Invoice | null>(null);
  const [dataModalTab, setDataModalTab] = useState<
    'backup' | 'seller' | 'catalog' | null
  >(null);

  const [filters, setFilters] = useState<DashboardFilters>({
    searchQuery: '',
    status: 'All',
    datePreset: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'dateDesc',
  });

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(theme));
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // Persist invoices
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    } catch {
      // ignore storage errors
    }
  }, [invoices]);

  // Persist seller, bank, catalog
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELLER, JSON.stringify(defaultSeller));
      localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(defaultBank));
      localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalog));
    } catch {
      // ignore storage errors
    }
  }, [defaultSeller, defaultBank, catalog]);

  const createBlankInvoice = (): Invoice => {
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);

    return {
      id: `inv-${Date.now()}`,
      invoiceNumber: generateNextInvoiceNumber(invoices),
      issueDate: today,
      dueDate: due,
      status: 'Pending',
      currency: 'INR',
      taxMode: 'CGST_SGST',
      placeOfSupply: '27 - Maharashtra',
      purchaseOrderNumber: '',
      seller: { ...defaultSeller },
      buyer: {
        name: '',
        companyName: '',
        taxId: '',
        email: '',
        phone: '',
        addressLine1: '',
        cityStatePostal: '',
        country: 'India',
      },
      bankDetails: { ...defaultBank },
      items: [
        {
          id: `item-${Date.now()}-1`,
          name: '',
          description: '',
          skuOrHsn: '',
          packagingType: 'Box',
          unitsPerPackage: 10,
          packageCount: 1,
          quantity: 10,
          priceEntryMode: 'EXCLUSIVE',
          unitPrice: 0,
          unitPriceInclusive: 0,
          packagingCostPerPkg: 0,
          discountPercent: 0,
          taxPercent: 18,
          cgstPercent: 9,
          sgstPercent: 9,
          igstPercent: 18,
        },
      ],
      shippingAndHandling: 0,
      additionalDiscountAmount: 0,
      roundOff: true,
      notes: '',
      termsAndConditions:
        'Payment due within 15 days of issue. Please quote invoice number on remittance.',
      pdfOptions: { ...defaultPdfOptions },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const handleStartNewInvoice = () => {
    const blank = createBlankInvoice();
    setEditingInvoice(blank);
    setIsCreatingNew(true);
    setActiveView('editor');
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(JSON.parse(JSON.stringify(invoice)));
    setIsCreatingNew(false);
    setActiveView('editor');
  };

  const handleSaveInvoice = (saved: Invoice) => {
    setInvoices((prev) => {
      const exists = prev.some((i) => i.id === saved.id);
      if (exists) {
        return prev.map((i) => (i.id === saved.id ? saved : i));
      }
      return [saved, ...prev];
    });
    setEditingInvoice(saved);
    setIsCreatingNew(false);
  };

  const handleDuplicateInvoice = (source: Invoice) => {
    const today = new Date().toISOString().slice(0, 10);
    const cloned: Invoice = {
      ...JSON.parse(JSON.stringify(source)),
      id: `inv-${Date.now()}`,
      invoiceNumber: generateNextInvoiceNumber(invoices),
      issueDate: today,
      status: 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setInvoices((prev) => [cloned, ...prev]);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
  };

  const handleStatusChange = (invoiceId: string, status: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status, updatedAt: new Date().toISOString() }
          : inv
      )
    );
  };

  const handleUpdateInvoicePdfOptions = (
    invoiceId: string,
    updatedOptions: PdfPageOptions
  ) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              pdfOptions: updatedOptions,
              updatedAt: new Date().toISOString(),
            }
          : inv
      )
    );
    if (editingInvoice && editingInvoice.id === invoiceId) {
      setEditingInvoice({
        ...editingInvoice,
        pdfOptions: updatedOptions,
      });
    }
  };

  const handleImportBackup = (
    backup: Partial<BilluminatiBackup>,
    mode: 'merge' | 'replace'
  ) => {
    if (Array.isArray(backup.invoices)) {
      if (mode === 'replace') {
        setInvoices(backup.invoices);
      } else {
        setInvoices((prev) => {
          const map = new Map<string, Invoice>();
          for (const inv of prev) map.set(inv.id, inv);
          for (const inv of backup.invoices!) map.set(inv.id, inv);
          return Array.from(map.values());
        });
      }
    }
    if (backup.defaultSeller) setDefaultSeller(backup.defaultSeller);
    if (backup.defaultBank) setDefaultBank(backup.defaultBank);
    if (Array.isArray(backup.catalog)) setCatalog(backup.catalog);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 bg-square-ruled flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-800">
        {/* Zone 1: Brand Title, single text element */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0"
        >
          Billuminati
        </a>

        {/* Zone 2: 4–5 concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('dashboard');
            }}
            className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'dashboard'
                ? 'text-slate-900 dark:text-white font-semibold underline'
                : ''
            }`}
          >
            Dashboard
          </a>

          <a
            href="#new-invoice"
            onClick={(e) => {
              e.preventDefault();
              handleStartNewInvoice();
            }}
            className={`hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'editor'
                ? 'text-slate-900 dark:text-white font-semibold underline'
                : ''
            }`}
          >
            Invoice Builder
          </a>

          <a
            href="#catalog"
            onClick={(e) => {
              e.preventDefault();
              setDataModalTab('catalog');
            }}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Item Catalog
          </a>

          <a
            href="#seller-profile"
            onClick={(e) => {
              e.preventDefault();
              setDataModalTab('seller');
            }}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Seller Profile
          </a>

          <a
            href="#json-backup"
            onClick={(e) => {
              e.preventDefault();
              setDataModalTab('backup');
            }}
            className="hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            JSON Data
          </a>
        </nav>

        {/* Zone 3: Primary Action & Theme Switch */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={
              theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
            }
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={handleStartNewInvoice}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Bill
          </button>
        </div>
      </header>

      {/* Main Responsive Workspace Container */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeView === 'dashboard' || !editingInvoice ? (
          <DashboardView
            invoices={invoices}
            filters={filters}
            onUpdateFilters={(next) =>
              setFilters((prev) => ({ ...prev, ...next }))
            }
            onCreateNew={handleStartNewInvoice}
            onEditInvoice={handleEditInvoice}
            onOpenPdfPreview={(inv) => setPdfPreviewInvoice(inv)}
            onDuplicateInvoice={handleDuplicateInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onStatusChange={handleStatusChange}
            onOpenDataModal={() => setDataModalTab('backup')}
          />
        ) : (
          <InvoiceEditorView
            initialInvoice={editingInvoice}
            catalog={catalog}
            isNew={isCreatingNew}
            onSave={handleSaveInvoice}
            onCancel={() => setActiveView('dashboard')}
            onOpenPdfPreview={(inv) => setPdfPreviewInvoice(inv)}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Billuminati — Tax Invoice & Packaging Ledger</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setDataModalTab('backup')}
              className="hover:text-slate-900 dark:hover:text-slate-200 underline-offset-4 hover:underline cursor-pointer"
            >
              Export / Import JSON
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setDataModalTab('seller')}
              className="hover:text-slate-900 dark:hover:text-slate-200 underline-offset-4 hover:underline cursor-pointer"
            >
              Default Seller Settings
            </button>
          </div>
        </div>
      </footer>

      {/* Live PDF Preview & Page Options Modal */}
      {pdfPreviewInvoice && (
        <PdfPreviewModal
          invoice={pdfPreviewInvoice}
          onClose={() => setPdfPreviewInvoice(null)}
          onUpdateInvoiceOptions={handleUpdateInvoicePdfOptions}
        />
      )}

      {/* JSON Backup, Seller Defaults & Catalog Modal */}
      {dataModalTab && (
        <DataSettingsModal
          invoices={invoices}
          defaultSeller={defaultSeller}
          defaultBank={defaultBank}
          defaultPdfOptions={defaultPdfOptions}
          catalog={catalog}
          initialTab={dataModalTab}
          onClose={() => setDataModalTab(null)}
          onImportBackup={handleImportBackup}
          onUpdateDefaults={(seller, bank) => {
            setDefaultSeller(seller);
            setDefaultBank(bank);
          }}
          onUpdateCatalog={setCatalog}
        />
      )}
    </div>
  );
}
