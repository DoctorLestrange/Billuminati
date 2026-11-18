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
} from 'lucide-react';
import {
  BankDetails,
  BilluminatiBackup,
  CatalogItem,
  Invoice,
  PackagingType,
  PartyDetails,
  PdfPageOptions,
} from '../types/billing';
import {
  formatCurrency,
  validateAndParseBackupJson,
} from '../utils/billing';

interface DataSettingsModalProps {
  invoices: Invoice[];
  defaultSeller: PartyDetails;
  defaultBank: BankDetails;
  defaultPdfOptions: PdfPageOptions;
  catalog: CatalogItem[];
  initialTab?: 'backup' | 'seller' | 'catalog';
  onClose: () => void;
  onImportBackup: (
    data: Partial<BilluminatiBackup>,
    mode: 'merge' | 'replace'
  ) => void;
  onUpdateDefaults: (
    seller: PartyDetails,
    bank: BankDetails
  ) => void;
  onUpdateCatalog: (items: CatalogItem[]) => void;
}

const PACKAGING_TYPES: PackagingType[] = [
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

export const DataSettingsModal: React.FC<DataSettingsModalProps> = ({
  invoices,
  defaultSeller,
  defaultBank,
  defaultPdfOptions,
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
  const [savedDefaultsToast, setSavedDefaultsToast] = useState(false);

  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([...catalog]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSku, setNewCatSku] = useState('');
  const [newCatPkg, setNewCatPkg] = useState<PackagingType>('Box');
  const [newCatUnits, setNewCatUnits] = useState(10);
  const [newCatPrice, setNewCatPrice] = useState(50);
  const [newCatPkgCost, setNewCatPkgCost] = useState(0);
  const [newCatTax, setNewCatTax] = useState(18);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportJson = () => {
    const payload: BilluminatiBackup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'Billuminati',
      invoices,
      defaultSeller: seller,
      defaultBank: bank,
      defaultPdfOptions,
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

    onImportBackup(result.backup, importMode);
    setImportStatus({
      type: 'success',
      message: `Successfully imported ${
        result.invoices?.length || 0
      } invoice(s) (${importMode === 'merge' ? 'merged with existing' : 'replaced archive'}).`,
    });
    setRawJsonInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        processJsonImport(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveSellerDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDefaults(seller, bank);
    setSavedDefaultsToast(true);
    setTimeout(() => setSavedDefaultsToast(false), 2000);
  };

  const handleAddCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const added: CatalogItem = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      skuOrHsn: newCatSku.trim(),
      packagingType: newCatPkg,
      unitsPerPackage: Math.max(1, Number(newCatUnits) || 1),
      unitPrice: Math.max(0, Number(newCatPrice) || 0),
      packagingCostPerPkg: Math.max(0, Number(newCatPkgCost) || 0),
      taxPercent: Math.max(0, Number(newCatTax) || 0),
    };
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="JSON Data Backup and Business Defaults"
    >
      <div className="flex flex-col w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Workspace Data & Business Defaults
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Export or import all bills as JSON, configure default seller details, or manage quick-add items.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings modal"
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Default Seller & Bank
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Export All Bill Data as JSON
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                    Downloads a complete portable backup containing all {invoices.length} invoice(s), seller profile, and item presets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON Backup
                </button>
              </div>

              {/* Import Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Import Bill Data from JSON
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      Restore bills from a `.json` file or paste raw JSON below.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="import-mode-select" className="text-slate-500">
                      Import Mode:
                    </label>
                    <select
                      id="import-mode-select"
                      value={importMode}
                      onChange={(e) =>
                        setImportMode(e.target.value as 'merge' | 'replace')
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Choose .JSON File to Import
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <label
                    htmlFor="paste-json-textarea"
                    className="block font-medium text-slate-700 dark:text-slate-300"
                  >
                    Or paste JSON payload directly:
                  </label>
                  <textarea
                    id="paste-json-textarea"
                    rows={5}
                    placeholder='{"app": "Billuminati", "invoices": [...]}'
                    value={rawJsonInput}
                    onChange={(e) => setRawJsonInput(e.target.value)}
                    className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                  {rawJsonInput.trim() && (
                    <button
                      type="button"
                      onClick={() => processJsonImport(rawJsonInput)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
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
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Default Seller / Issuer Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={seller.companyName}
                      onChange={(e) =>
                        setSeller({ ...seller, companyName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Tax ID / GSTIN / VAT Reg.
                    </label>
                    <input
                      type="text"
                      value={seller.taxId}
                      onChange={(e) =>
                        setSeller({ ...seller, taxId: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={seller.name}
                      onChange={(e) =>
                        setSeller({ ...seller, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Billing Email
                    </label>
                    <input
                      type="email"
                      value={seller.email}
                      onChange={(e) =>
                        setSeller({ ...seller, email: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={seller.addressLine1}
                      onChange={(e) =>
                        setSeller({ ...seller, addressLine1: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      City, State & Postal Code
                    </label>
                    <input
                      type="text"
                      value={seller.cityStatePostal}
                      onChange={(e) =>
                        setSeller({ ...seller, cityStatePostal: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                  Default Bank Remittance Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bank.bankName}
                      onChange={(e) =>
                        setBank({ ...bank, bankName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={bank.accountName}
                      onChange={(e) =>
                        setBank({ ...bank, accountName: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bank.accountNumber}
                      onChange={(e) =>
                        setBank({ ...bank, accountNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Routing / IFSC / Sort Code
                    </label>
                    <input
                      type="text"
                      value={bank.routingOrIfsc}
                      onChange={(e) =>
                        setBank({ ...bank, routingOrIfsc: e.target.value })
                      }
                      className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>
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
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
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
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3"
              >
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Add Item to Quick-Fill Catalog
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Steel Fastener Kit"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      HSN / SKU
                    </label>
                    <input
                      type="text"
                      placeholder="7318.15"
                      value={newCatSku}
                      onChange={(e) => setNewCatSku(e.target.value)}
                      className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Packaging
                    </label>
                    <select
                      value={newCatPkg}
                      onChange={(e) =>
                        setNewCatPkg(e.target.value as PackagingType)
                      }
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    >
                      {PACKAGING_TYPES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newCatPrice}
                      onChange={(e) => setNewCatPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Preset
                    </button>
                  </div>
                </div>
              </form>

              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                {catalogItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        HSN/SAC: {item.skuOrHsn || '—'} · Default:{' '}
                        {item.unitsPerPackage} units/{item.packagingType} · Rate:{' '}
                        {formatCurrency(item.unitPrice)} · GST: {item.taxPercent}%
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCatalogItem(item.id)}
                      aria-label={`Remove ${item.name} from catalog`}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
