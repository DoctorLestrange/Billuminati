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
  DEFAULT_TERMS_AND_CONDITIONS,
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
import { GITHUB_REPO_URL, WelcomeModal } from './components/WelcomeModal';

const STORAGE_KEYS = {
  INVOICES: 'billuminati_invoices_clean_v1',
  SELLER: 'billuminati_default_seller_clean_v1',
  BANK: 'billuminati_default_bank_clean_v1',
  PDF_OPTS: 'billuminati_default_pdf_clean_v1',
  TERMS: 'billuminati_default_terms_clean_v1',
  CATALOG: 'billuminati_catalog_clean_v1',
  THEME: 'billuminati_theme_v1',
  WELCOME_SEEN: 'billuminati_welcome_seen_v1',
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

  const [defaultTermsAndConditions, setDefaultTermsAndConditions] =
    useState<string>(() =>
      loadFromStorage(STORAGE_KEYS.TERMS, DEFAULT_TERMS_AND_CONDITIONS)
    );

  const [defaultPdfOptions, setDefaultPdfOptions] = useState<PdfPageOptions>(
    () => ({
      ...DEFAULT_PDF_OPTIONS,
      ...loadFromStorage(STORAGE_KEYS.PDF_OPTS, DEFAULT_PDF_OPTIONS),
    })
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

  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('autostart') === '1') {
          return false;
        }
      }
      const alreadySeen = localStorage.getItem(STORAGE_KEYS.WELCOME_SEEN);
      return alreadySeen !== 'true';
    } catch {
      return false;
    }
  });

  // Mark welcome screen as seen immediately once displayed so it never appears again
  useEffect(() => {
    if (showWelcomeModal) {
      try {
        localStorage.setItem(STORAGE_KEYS.WELCOME_SEEN, 'true');
      } catch {
        // ignore storage errors
      }
    }
  }, [showWelcomeModal]);

  const handleDismissWelcome = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.WELCOME_SEEN, 'true');
    } catch {
      // ignore storage errors
    }
    setShowWelcomeModal(false);
  };

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

  // Persist seller, bank, default terms, pdf options, catalog
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SELLER, JSON.stringify(defaultSeller));
      localStorage.setItem(STORAGE_KEYS.BANK, JSON.stringify(defaultBank));
      localStorage.setItem(
        STORAGE_KEYS.PDF_OPTS,
        JSON.stringify(defaultPdfOptions)
      );
      localStorage.setItem(
        STORAGE_KEYS.TERMS,
        JSON.stringify(defaultTermsAndConditions)
      );
      localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(catalog));
    } catch {
      // ignore storage errors
    }
  }, [
    defaultSeller,
    defaultBank,
    defaultPdfOptions,
    defaultTermsAndConditions,
    catalog,
  ]);

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
      placeOfSupply: '',
      purchaseOrderNumber: '',
      isCashCustomer: false,
      paymentMethod: '',
      paymentMethodOther: '',
      paymentDate: '',
      paymentMethodDetails: '',
      calculateDiscountOnFinalValue: true,
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
          unitsPerPackage: 1,
          packageCount: 1,
          quantity: 1,
          priceEntryMode: 'EXCLUSIVE',
          unitPrice: 0,
          unitPriceInclusive: 0,
          discountAmount: 0,
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
      termsAndConditions: defaultTermsAndConditions,
      pdfOptions: { ...defaultPdfOptions, showSellerLogo: true },
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
    const normalized = normalizeInvoiceRecord(saved);
    setInvoices((prev) => {
      const exists = prev.some((i) => i.id === normalized.id);
      if (exists) {
        return prev.map((i) => (i.id === normalized.id ? normalized : i));
      }
      return [normalized, ...prev];
    });
    if (normalized.seller.logoDataUrl !== undefined) {
      setDefaultSeller((prev) => ({
        ...prev,
        logoDataUrl: normalized.seller.logoDataUrl,
      }));
    }
    setEditingInvoice(normalized);
    setIsCreatingNew(false);
  };

  const handleDuplicateInvoice = (source: Invoice) => {
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);
    const due = new Date(now + 15 * 86400000).toISOString().slice(0, 10);
    const sourceCopy: Invoice = JSON.parse(JSON.stringify(source));
    const cloned: Invoice = normalizeInvoiceRecord({
      ...sourceCopy,
      id: `inv-${now}`,
      invoiceNumber: generateNextInvoiceNumber(invoices),
      issueDate: today,
      dueDate: due,
      status: 'Pending',
      paymentMethod: '',
      paymentMethodOther: '',
      paymentDate: '',
      paymentMethodDetails: '',
      items: sourceCopy.items.map((item, idx) => ({
        ...item,
        id: `item-${now}-${idx + 1}`,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setInvoices((prev) => [cloned, ...prev]);
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoices((prev) => prev.filter((i) => i.id !== invoiceId));
  };

  const handleStatusChange = (invoiceId: string, status: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? {
              ...inv,
              status,
              dueDate:
                status === 'Paid'
                  ? ''
                  : inv.dueDate ||
                    new Date(Date.now() + 15 * 86400000)
                      .toISOString()
                      .slice(0, 10),
              paymentMethod: status === 'Paid' ? inv.paymentMethod || '' : '',
              paymentMethodOther:
                status === 'Paid' ? inv.paymentMethodOther || '' : '',
              paymentDate: status === 'Paid' ? inv.paymentDate || '' : '',
              paymentMethodDetails:
                status === 'Paid' ? inv.paymentMethodDetails || '' : '',
              updatedAt: new Date().toISOString(),
            }
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
    if (pdfPreviewInvoice && pdfPreviewInvoice.id === invoiceId) {
      setPdfPreviewInvoice({
        ...pdfPreviewInvoice,
        pdfOptions: updatedOptions,
      });
    }
  };

  const handleUpdateSellerLogo = (invoiceId: string, logoDataUrl: string) => {
    setDefaultSeller((prev) => ({ ...prev, logoDataUrl }));
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId || !inv.seller.logoDataUrl
          ? {
              ...inv,
              seller: { ...inv.seller, logoDataUrl },
              updatedAt: new Date().toISOString(),
            }
          : inv
      )
    );
    if (editingInvoice) {
      setEditingInvoice((prev) =>
        prev
          ? {
              ...prev,
              seller: { ...prev.seller, logoDataUrl },
            }
          : null
      );
    }
    if (pdfPreviewInvoice && pdfPreviewInvoice.id === invoiceId) {
      setPdfPreviewInvoice({
        ...pdfPreviewInvoice,
        seller: { ...pdfPreviewInvoice.seller, logoDataUrl },
      });
    }
  };

  const handleImportBackup = (
    backup: Partial<BilluminatiBackup>,
    mode: 'merge' | 'replace'
  ) => {
    if (Array.isArray(backup.invoices)) {
      const normalizedIncoming = backup.invoices.map((inv, idx) =>
        normalizeInvoiceRecord(inv, idx)
      );
      if (mode === 'replace') {
        setInvoices(normalizedIncoming);
        setActiveView('dashboard');
        setEditingInvoice(null);
      } else {
        setInvoices((prev) => {
          const map = new Map<string, Invoice>();
          for (const inv of prev) map.set(inv.id, inv);
          for (const inv of normalizedIncoming) map.set(inv.id, inv);
          return Array.from(map.values());
        });
      }
    }
    if (backup.defaultSeller && typeof backup.defaultSeller === 'object') {
      setDefaultSeller((prev) => ({ ...prev, ...backup.defaultSeller }));
    }
    if (backup.defaultBank && typeof backup.defaultBank === 'object') {
      setDefaultBank((prev) => ({ ...prev, ...backup.defaultBank }));
    }
    if (backup.defaultPdfOptions && typeof backup.defaultPdfOptions === 'object') {
      setDefaultPdfOptions((prev) => ({
        ...prev,
        ...backup.defaultPdfOptions,
      }));
    }
    if (typeof backup.defaultTermsAndConditions === 'string') {
      setDefaultTermsAndConditions(backup.defaultTermsAndConditions);
    }
    if (Array.isArray(backup.catalog)) {
      setCatalog(backup.catalog);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#111113] text-zinc-900 dark:text-zinc-100 bg-square-ruled flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xs border-b border-zinc-200 dark:border-[#2a2a2e]">
        {/* Zone 1: Brand Title, single text element in original Plus Jakarta Sans without dot */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('dashboard');
          }}
          className="font-brand inline-flex items-baseline text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap shrink-0"
        >
          Billuminati
        </a>

        {/* Zone 2: 4–5 concise single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-600 dark:text-zinc-300"
        >
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              setActiveView('dashboard');
            }}
            className={`hover:text-zinc-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'dashboard'
                ? 'text-zinc-900 dark:text-white font-semibold underline'
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
            className={`hover:text-zinc-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeView === 'editor'
                ? 'text-zinc-900 dark:text-white font-semibold underline'
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
            className="hover:text-zinc-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Item Catalog
          </a>

          <a
            href="#seller-profile"
            onClick={(e) => {
              e.preventDefault();
              setDataModalTab('seller');
            }}
            className="hover:text-zinc-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Seller Profile
          </a>

          <a
            href="#json-backup"
            onClick={(e) => {
              e.preventDefault();
              setDataModalTab('backup');
            }}
            className="hover:text-zinc-900 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
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
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#26262a] rounded-lg transition-colors cursor-pointer"
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
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
      <footer className="border-t border-zinc-200/80 dark:border-[#2a2a2e] bg-white/60 dark:bg-[#18181b]/70 px-6 py-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Billuminati — Tax Invoice & Packaging Ledger</span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setDataModalTab('backup')}
              className="hover:text-zinc-900 dark:hover:text-zinc-200 underline-offset-4 hover:underline cursor-pointer"
            >
              Export / Import JSON
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => setDataModalTab('seller')}
              className="hover:text-zinc-900 dark:hover:text-zinc-200 underline-offset-4 hover:underline cursor-pointer"
            >
              Default Seller Settings
            </button>
            <span>·</span>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] hover:text-zinc-900 dark:hover:text-zinc-200 underline-offset-4 hover:underline"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>

      {/* One-Time First-Visit Welcome Modal */}
      {showWelcomeModal && (
        <WelcomeModal
          onDismiss={handleDismissWelcome}
          onSetupSellerProfile={() => {
            handleDismissWelcome();
            setDataModalTab('seller');
          }}
        />
      )}

      {/* Live PDF Preview & Page Options Modal */}
      {pdfPreviewInvoice && (
        <PdfPreviewModal
          invoice={pdfPreviewInvoice}
          onClose={() => setPdfPreviewInvoice(null)}
          onUpdateInvoiceOptions={handleUpdateInvoicePdfOptions}
          onUpdateSellerLogo={handleUpdateSellerLogo}
        />
      )}

      {/* JSON Backup, Seller Defaults & Catalog Modal */}
      {dataModalTab && (
        <DataSettingsModal
          invoices={invoices}
          defaultSeller={defaultSeller}
          defaultBank={defaultBank}
          defaultPdfOptions={defaultPdfOptions}
          defaultTermsAndConditions={defaultTermsAndConditions}
          catalog={catalog}
          initialTab={dataModalTab}
          onClose={() => setDataModalTab(null)}
          onImportBackup={handleImportBackup}
          onUpdateDefaults={(seller, bank, defaultTerms) => {
            setDefaultSeller(seller);
            setDefaultBank(bank);
            setDefaultTermsAndConditions(defaultTerms);
            setInvoices((prev) =>
              prev.map((inv) => ({
                ...inv,
                seller: {
                  ...inv.seller,
                  logoDataUrl: seller.logoDataUrl,
                },
              }))
            );
            if (editingInvoice) {
              setEditingInvoice((prev) =>
                prev
                  ? {
                      ...prev,
                      seller: { ...prev.seller, logoDataUrl: seller.logoDataUrl },
                    }
                  : null
              );
            }
          }}
          onUpdateCatalog={setCatalog}
        />
      )}
    </div>
  );
}
