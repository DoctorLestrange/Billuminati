import React, { useRef, useState } from 'react';
import {
  Download,
  Upload,
  X,
  Check,
  AlertCircle,
  Building2,
  Package,
  Plus,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import {
  BankDetails,
  BilluminatiBackup,
  CatalogItem,
  Invoice,
  PACKAGING_OPTIONS,
  PackagingType,
  PartyDetails,
  PdfPageOptions,
} from '../types/billing';
import {
  createCatalogItemFromInclusivePrice,
  formatCurrency,
  getCatalogItemInclusivePrice,
  processSellerLogoFile,
  roundCurrency,
  validateAndParseBackupJson,
} from '../utils/billing';

interface DataSettingsModalProps {
  invoices: Invoice[];
  defaultSeller: PartyDetails;
  defaultBank: BankDetails;
  defaultPdfOptions: PdfPageOptions;
  defaultTermsAndConditions: string;
  catalog: CatalogItem[];
  initialTab?: 'backup' | 'seller' | 'catalog';
  onClose: () => void;
  onImportBackup: (
    data: Partial<BilluminatiBackup>,
    mode: 'merge' | 'replace'
  ) => void;
  onUpdateDefaults: (
    seller: PartyDetails,
    bank: BankDetails,
    defaultTermsAndConditions: string
  ) => void;
  onUpdateCatalog: (items: CatalogItem[]) => void;
}

export const DataSettingsModal: React.FC<DataSettingsModalProps> = ({
  invoices,
  defaultSeller,
  defaultBank,
  defaultPdfOptions,
  defaultTermsAndConditions,
  catalog,
  initialTab = 'backup',
  onClose,
  onImportBackup,
  onUpdateDefaults,
  onUpdateCatalog,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'seller' | 'catalog'>(
    initialTab
  );
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [rawJsonInput, setRawJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [seller, setSeller] = useState<PartyDetails>({ ...defaultSeller });
  const [bank, setBank] = useState<BankDetails>({ ...defaultBank });
  const [defaultTerms, setDefaultTerms] = useState<string>(
    defaultTermsAndConditions || ''
  );
  const [savedDefaultsToast, setSavedDefaultsToast] = useState(false);
  const [logoStatus, setLogoStatus] = useState<string | null>(null);

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([...catalog]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSku, setNewCatSku] = useState('');
  const [newCatPkg, setNewCatPkg] = useState<PackagingType>('Box');
  const [newCatPriceIncl, setNewCatPriceIncl] = useState(1180);
  const [newCatTax, setNewCatTax] = useState(18);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleExportJson = () => {
    const payload: BilluminatiBackup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      app: 'Billuminati',
      invoices,
      defaultSeller: seller,
      defaultBank: bank,
      defaultPdfOptions,
      defaultTermsAndConditions: defaultTerms,
      catalog: catalogItems,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billuminati-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const processJsonImport = (jsonString: string) => {
    const result = validateAndParseBackupJson(jsonString);
    if (!result.valid || !result.backup) {
      setImportStatus({
        type: 'error',
        message: result.error || 'Invalid backup JSON file.',
      });
      return;
    }

    if (result.backup.defaultSeller) {
      setSeller((prev) => ({ ...prev, ...result.backup!.defaultSeller }));
    }
    if (result.backup.defaultBank) {
      setBank((prev) => ({ ...prev, ...result.backup!.defaultBank }));
    }
    if (typeof result.backup.defaultTermsAndConditions === 'string') {
      setDefaultTerms(result.backup.defaultTermsAndConditions);
    }
    if (Array.isArray(result.backup.catalog)) {
      setCatalogItems(result.backup.catalog);
    }

    onImportBackup(result.backup, importMode);
    const count = result.invoices?.length || 0;
    const extras: string[] = [];
    if (result.backup.defaultSeller) extras.push('seller profile');
    if (result.backup.defaultBank) extras.push('bank details');
    if (Array.isArray(result.backup.catalog)) {
      extras.push(`${result.backup.catalog.length} catalog item(s)`);
    }
    setImportStatus({
      type: 'success',
      message: `Successfully imported ${count} invoice(s)${
        extras.length > 0 ? ` along with ${extras.join(', ')}` : ''
      } (${importMode === 'merge' ? 'merged with existing' : 'replaced archive'}).`,
    });
    setRawJsonInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      setImportStatus({
        type: 'error',
        message: 'Failed to read the selected JSON file.',
      });
    };
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processJsonImport(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSellerLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const squareDataUrl = await processSellerLogoFile(file, 512);
      const nextSeller = { ...seller, logoDataUrl: squareDataUrl };
      setSeller(nextSeller);
      onUpdateDefaults(nextSeller, bank, defaultTerms);
      setLogoStatus('Logo squared (aspect ratio preserved) & scaled to 512×512px.');
      setTimeout(() => setLogoStatus(null), 3500);
    } catch (err) {
      setLogoStatus(err instanceof Error ? err.message : 'Failed to process logo.');
    } finally {
      e.target.value = '';
    }
  };

  const handleClearSellerLogo = () => {
    const nextSeller = { ...seller, logoDataUrl: '' };
    setSeller(nextSeller);
    onUpdateDefaults(nextSeller, bank, defaultTerms);
    setLogoStatus(null);
  };

  const handleSaveSellerDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDefaults(seller, bank, defaultTerms);
    setSavedDefaultsToast(true);
    setTimeout(() => setSavedDefaultsToast(false), 2000);
  };

  const handleAddCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const added = createCatalogItemFromInclusivePrice({
      id: `cat-${Date.now()}`,
      name: newCatName,
      skuOrHsn: newCatSku,
      packagingType: newCatPkg,
      unitPriceInclusive: newCatPriceIncl,
      taxPercent: newCatTax,
    });
    const next = [...catalogItems, added];
    setCatalogItems(next);
    onUpdateCatalog(next);
    setNewCatName('');
    setNewCatSku('');
  };

  const handleRemoveCatalogItem = (id: string) => {
    const next = catalogItems.filter((item) => item.id !== id);
    setCatalogItems(next);
    onUpdateCatalog(next);
  };

  const previewExclPrice = roundCurrency(
    Math.max(0, Number(newCatPriceIncl) || 0) /
      (1 + Math.min(100, Math.max(0, Number(newCatTax) || 0)) / 100)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="JSON Data Backup and Business Defaults"
    >
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-[#2a2a2e] rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-[#2a2a2e]">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Workspace Data & Business Defaults
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Export or import all bills as JSON, configure default seller details, logo & terms, or manage quick-add items.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings modal"
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#26262a] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-zinc-200 dark:border-[#2a2a2e] bg-zinc-50/70 dark:bg-[#1c1c20] text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            JSON Export & Import
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seller')}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'seller'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Default Seller & Logo
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100 font-semibold'
                : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Saved Item Catalog ({catalogItems.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-6">
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Export Section */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#2a2a2e] bg-zinc-50/70 dark:bg-[#202024] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Export All Bill Data as JSON
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Downloads a complete portable backup containing all {invoices.length} invoice(s), seller profile, and item presets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON Backup
                </button>
              </div>

              {/* Import Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Import Bill Data from JSON
                    </h3>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Restore bills from a `.json` file or paste raw JSON below.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="import-mode-select" className="text-zinc-500">
                      Import Mode:
                    </label>
                    <select
                      id="import-mode-select"
                      value={importMode}
                      onChange={(e) =>
                        setImportMode(e.target.value as 'merge' | 'replace')
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    >
                      <option value="merge">Merge with existing bills</option>
                      <option value="replace">Replace all existing bills</option>
                    </select>
                  </div>
                </div>

                {importStatus && (
                  <div
                    className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                      importStatus.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                    }`}
                  >
                    {importStatus.type === 'success' ? (
                      <Check className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{importStatus.message}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-white dark:bg-[#222226] border border-zinc-300 dark:border-[#323238] hover:bg-zinc-50 dark:hover:bg-[#2b2b30] rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Choose .JSON File to Import
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <label
                    htmlFor="paste-json-textarea"
                    className="block font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Or paste JSON payload directly:
                  </label>
                  <textarea
                    id="paste-json-textarea"
                    rows={5}
                    placeholder='{"app": "Billuminati", "invoices": [...]}'
                    value={rawJsonInput}
                    onChange={(e) => setRawJsonInput(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-lg border border-zinc-300 dark:border-[#323238] bg-zinc-50 dark:bg-[#121214] text-zinc-900 dark:text-zinc-100"
                  />
                  {rawJsonInput.trim() && (
                    <button
                      type="button"
                      onClick={() => processJsonImport(rawJsonInput)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Validate & Import Pasted JSON
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seller' && (
            <form onSubmit={handleSaveSellerDefaults} className="space-y-5">
              {/* Seller Logo Upload Card */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-[#2a2a2e] bg-zinc-50/70 dark:bg-[#202024] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSellerLogoUpload}
                    className="hidden"
                    aria-label="Upload default seller logo"
                  />
                  {seller.logoDataUrl ? (
                    <img
                      src={seller.logoDataUrl}
                      alt="Default seller logo"
                      className="w-14 h-14 rounded-lg border border-zinc-200 dark:border-[#323238] object-contain bg-white p-1 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border border-dashed border-zinc-300 dark:border-[#323238] flex items-center justify-center text-zinc-400 shrink-0">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Seller Brand Logo (Square 512×512px)
                    </h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Non-square logos are expanded to a square canvas without changing aspect ratio and downscaled to 512px before saving.
                    </p>
                    {logoStatus && (
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                        {logoStatus}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 bg-white dark:bg-[#27272c] border border-zinc-300 dark:border-[#36363d] hover:bg-zinc-100 dark:hover:bg-[#323238] rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {seller.logoDataUrl ? 'Replace Logo' : 'Upload Logo'}
                  </button>
                  {seller.logoDataUrl && (
                    <button
                      type="button"
                      onClick={handleClearSellerLogo}
                      className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Default Seller / Issuer Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={seller.companyName}
                      onChange={(e) =>
                        setSeller({ ...seller, companyName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Tax ID / GSTIN / VAT Reg.
                    </label>
                    <input
                      type="text"
                      value={seller.taxId}
                      onChange={(e) =>
                        setSeller({ ...seller, taxId: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={seller.name}
                      onChange={(e) =>
                        setSeller({ ...seller, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Billing Email
                    </label>
                    <input
                      type="email"
                      value={seller.email}
                      onChange={(e) =>
                        setSeller({ ...seller, email: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={seller.addressLine1}
                      onChange={(e) =>
                        setSeller({ ...seller, addressLine1: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      City, State & Postal Code
                    </label>
                    <input
                      type="text"
                      value={seller.cityStatePostal}
                      onChange={(e) =>
                        setSeller({ ...seller, cityStatePostal: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-[#2a2a2e]">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Default Bank Remittance Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bank.bankName}
                      onChange={(e) =>
                        setBank({ ...bank, bankName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={bank.accountName}
                      onChange={(e) =>
                        setBank({ ...bank, accountName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bank.accountNumber}
                      onChange={(e) =>
                        setBank({ ...bank, accountNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Routing / IFSC / Sort Code
                    </label>
                    <input
                      type="text"
                      value={bank.routingOrIfsc}
                      onChange={(e) =>
                        setBank({ ...bank, routingOrIfsc: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-[#2a2a2e]">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Default Terms & Conditions (Optional)
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
                  Terms & Conditions are empty by default on new invoices unless you configure a default text below.
                </p>
                <textarea
                  id="default-terms-textarea"
                  aria-label="Default Terms and Conditions"
                  rows={2}
                  placeholder="Leave empty for blank Terms & Conditions, or enter default terms for new invoices..."
                  value={defaultTerms}
                  onChange={(e) => setDefaultTerms(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {savedDefaultsToast && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Saved default profile
                  </span>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white rounded-lg transition-colors cursor-pointer"
                >
                  Save Default Profile
                </button>
              </div>
            </form>
          )}

          {activeTab === 'catalog' && (
            <div className="space-y-5">
              <form
                onSubmit={handleAddCatalogItem}
                className="p-4 rounded-xl border border-zinc-200 dark:border-[#2a2a2e] bg-zinc-50/70 dark:bg-[#202024] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Add Item to Quick-Fill Catalog
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Enter the unit price inclusive of taxes and set the applicable GST / tax percentage.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">Quick Tax:</span>
                    {[0, 5, 12, 18, 28].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setNewCatTax(rate)}
                        className={`px-2 py-0.5 rounded border font-mono cursor-pointer transition-colors ${
                          Number(newCatTax) === rate
                            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100 font-semibold'
                            : 'bg-white dark:bg-[#26262b] border-zinc-300 dark:border-[#36363d] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#303036]'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-3">
                    <label
                      htmlFor="cat-item-name"
                      className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 whitespace-nowrap"
                    >
                      Item Name
                    </label>
                    <input
                      id="cat-item-name"
                      type="text"
                      required
                      placeholder="e.g. Dielectric Coolant (20L)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="cat-item-sku"
                      className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 whitespace-nowrap"
                    >
                      HSN / SAC
                    </label>
                    <input
                      id="cat-item-sku"
                      type="text"
                      placeholder="27101980"
                      value={newCatSku}
                      onChange={(e) => setNewCatSku(e.target.value)}
                      className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="cat-item-pkg"
                      className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 whitespace-nowrap"
                    >
                      Packaging
                    </label>
                    <select
                      id="cat-item-pkg"
                      value={newCatPkg}
                      onChange={(e) =>
                        setNewCatPkg(e.target.value as PackagingType)
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    >
                      {PACKAGING_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="cat-item-price-incl"
                      className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 whitespace-nowrap"
                    >
                      Unit Price (Incl. Tax ₹)
                    </label>
                    <input
                      id="cat-item-price-incl"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newCatPriceIncl}
                      onChange={(e) => setNewCatPriceIncl(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label
                      htmlFor="cat-item-tax"
                      className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1 whitespace-nowrap"
                    >
                      Tax (%)
                    </label>
                    <input
                      id="cat-item-tax"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={newCatTax}
                      onChange={(e) => setNewCatTax(Number(e.target.value))}
                      className="w-full px-2 py-1.5 font-mono rounded-lg border border-zinc-300 dark:border-[#323238] bg-white dark:bg-[#222226] text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      Add Preset
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                  <span>
                    Entered Incl. Tax: <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(newCatPriceIncl)}</strong>
                  </span>
                  <span>
                    Base Rate (Excl. {newCatTax}% Tax): <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(previewExclPrice)}</strong>
                  </span>
                </div>
              </form>

              <div className="divide-y divide-zinc-200 dark:divide-[#2a2a2e] border border-zinc-200 dark:border-[#2a2a2e] rounded-xl overflow-hidden">
                {catalogItems.map((item) => {
                  const inclPrice = getCatalogItemInclusivePrice(item);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#18181b]"
                    >
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                          HSN/SAC: {item.skuOrHsn || '—'} · Packaging:{' '}
                          {item.packagingType} · Unit Price (Incl. Tax):{' '}
                          <strong className="text-zinc-800 dark:text-zinc-200">
                            {formatCurrency(inclPrice)}
                          </strong>{' '}
                          (Excl: {formatCurrency(item.unitPrice)}) · Tax: {item.taxPercent}%
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCatalogItem(item.id)}
                        aria-label={`Remove ${item.name} from catalog`}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
