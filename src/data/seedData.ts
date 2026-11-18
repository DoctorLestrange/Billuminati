import {
  BankDetails,
  CatalogItem,
  Invoice,
  PartyDetails,
  PdfPageOptions,
} from '../types/billing';

export const DEFAULT_SELLER: PartyDetails = {
  name: '',
  companyName: '',
  taxId: '',
  email: '',
  phone: '',
  addressLine1: '',
  cityStatePostal: '',
  country: 'India',
  logoDataUrl: '',
};

export const DEFAULT_BANK: BankDetails = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  routingOrIfsc: '',
  swiftOrIban: '',
  paymentInstructions: '',
};

export const DEFAULT_PDF_OPTIONS: PdfPageOptions = {
  paperSize: 'a4',
  orientation: 'portrait',
  marginPreset: 'standard',
  accentColor: 'slate',
  headerTitle: 'TAX INVOICE',
  showSellerLogo: true,
  showSkuColumn: true,
  showPackagingColumn: true,
  showDiscountColumn: true,
  showTaxBreakdown: true,
  showAmountInWords: true,
  showBankDetails: true,
  showSignatureBlock: true,
  signatoryLabel: 'Authorized Signatory',
  footerNote: '',
};

export const DEFAULT_TERMS_AND_CONDITIONS = '';

export const INITIAL_CATALOG: CatalogItem[] = [];

export const INITIAL_INVOICES: Invoice[] = [];
