export type PackagingType =
  | 'Unit'
  | 'Piece'
  | 'Box'
  | 'Carton'
  | 'Bucket'
  | 'Tin'
  | 'Bottle'
  | 'Jar'
  | 'Can'
  | 'Drum'
  | 'Barrel'
  | 'Bag'
  | 'Sack'
  | 'Pouch'
  | 'Pack'
  | 'Bundle'
  | 'Roll'
  | 'Tube'
  | 'Crate'
  | 'Pallet'
  | 'Cylinder'
  | 'Container'
  | 'Set'
  | 'Pair'
  | 'Dozen';

export const PACKAGING_OPTIONS: PackagingType[] = [
  'Unit',
  'Piece',
  'Box',
  'Carton',
  'Bucket',
  'Tin',
  'Bottle',
  'Jar',
  'Can',
  'Drum',
  'Barrel',
  'Bag',
  'Sack',
  'Pouch',
  'Pack',
  'Bundle',
  'Roll',
  'Tube',
  'Crate',
  'Pallet',
  'Cylinder',
  'Container',
  'Set',
  'Pair',
  'Dozen',
];

export type TaxMode = 'CGST_SGST' | 'IGST' | 'EXEMPT';

export type PriceEntryMode = 'EXCLUSIVE' | 'INCLUSIVE';

export type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue' | 'Draft';

export type PaymentMethodType =
  | ''
  | 'Direct Bank Transfer'
  | 'UPI'
  | 'Cash'
  | 'Cheque'
  | 'Other';

export const PAYMENT_METHOD_OPTIONS: Array<{
  value: PaymentMethodType;
  label: string;
}> = [
  { value: '', label: 'Not Specified (Optional)' },
  { value: 'Direct Bank Transfer', label: 'Direct Bank Transfer (NEFT / RTGS / IMPS)' },
  { value: 'UPI', label: 'UPI' },
  { value: 'Cash', label: 'Cash' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Other', label: 'Others (Specify)' },
];

export interface InvoiceLineItem {
  id: string;
  name: string;
  description?: string;
  skuOrHsn: string;
  packagingType: PackagingType;
  unitsPerPackage: number;
  packageCount: number;
  quantity: number; // total billable quantity
  priceEntryMode?: PriceEntryMode; // whether user last anchored Excl. or Incl. rate
  unitPrice: number; // Unit price exclusive of GST (₹)
  unitPriceInclusive?: number; // Unit price inclusive of GST (₹)
  discountAmount?: number; // Line item discount in rupees (₹)
  packagingCostPerPkg?: number; // legacy field (unused)
  discountPercent?: number; // legacy field (unused)
  taxPercent: number; // Total GST % (CGST % + SGST % or IGST %)
  cgstPercent: number; // Explicit CGST %
  sgstPercent: number; // Explicit SGST %
  igstPercent: number; // Explicit IGST %
}

export interface PartyDetails {
  name: string;
  companyName: string;
  taxId: string; // GSTIN
  email: string;
  phone: string;
  addressLine1: string;
  cityStatePostal: string;
  country: string;
  logoDataUrl?: string; // Square 512x512 PNG data URL for Seller Logo
}

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingOrIfsc: string; // IFSC Code
  swiftOrIban?: string; // UPI ID or Branch
  paymentInstructions?: string;
}

export interface PdfPageOptions {
  paperSize: 'a4' | 'letter' | 'legal';
  orientation: 'portrait' | 'landscape';
  marginPreset: 'compact' | 'standard' | 'wide';
  accentColor: 'slate' | 'indigo' | 'emerald' | 'amber' | 'crimson';
  headerTitle: string; // e.g. "TAX INVOICE", "PROFORMA INVOICE"
  showSellerLogo?: boolean;
  showSkuColumn: boolean;
  showPackagingColumn: boolean;
  showDiscountColumn: boolean;
  showTaxBreakdown: boolean;
  showAmountInWords: boolean;
  showBankDetails: boolean;
  showSignatureBlock: boolean;
  signatoryLabel: string;
  footerNote: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD (empty string when status is 'Paid')
  status: InvoiceStatus;
  currency: 'INR';
  taxMode: TaxMode;
  placeOfSupply: string;
  purchaseOrderNumber: string;
  isCashCustomer?: boolean;
  paymentMethod?: PaymentMethodType;
  paymentMethodOther?: string;
  paymentMethodDetails?: string;
  calculateDiscountOnFinalValue?: boolean;
  seller: PartyDetails;
  buyer: PartyDetails;
  bankDetails: BankDetails;
  items: InvoiceLineItem[];
  shippingAndHandling: number;
  additionalDiscountAmount: number;
  roundOff: boolean;
  notes: string;
  termsAndConditions: string;
  pdfOptions: PdfPageOptions;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  skuOrHsn: string;
  packagingType: PackagingType;
  unitsPerPackage: number;
  unitPrice: number;
  unitPriceInclusive?: number;
  packagingCostPerPkg?: number;
  taxPercent: number;
}

export interface BilluminatiBackup {
  version: number;
  exportedAt: string;
  app: 'Billuminati';
  invoices: Invoice[];
  defaultSeller: PartyDetails;
  defaultBank: BankDetails;
  defaultPdfOptions: PdfPageOptions;
  defaultTermsAndConditions?: string;
  catalog: CatalogItem[];
}

export type DateFilterPreset = 'all' | 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

export interface DashboardFilters {
  searchQuery: string;
  status: 'All' | InvoiceStatus;
  datePreset: DateFilterPreset;
  dateFrom: string;
  dateTo: string;
  sortBy: 'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc' | 'numberAsc';
}
