# Billuminati — GST Tax Invoice & Billing Studio

**Billuminati** is a fast, uncluttered, offline-capable Indian GST Tax Invoice and billing studio built with React, TypeScript, Tailwind CSS, and `jsPDF`. It is designed for businesses, manufacturers, traders, and service providers who want accurate tax-compliant billing, bidirectional rate calculations, packaging breakdowns, print-ready PDF invoices, and portable JSON backups without server lock-in.

---

## Key Features

### 1. Indian GST Compliance & Dynamic Bidirectional Pricing
- **GST Regimes**: Supports **CGST + SGST (Intra-State)**, **IGST (Inter-State)**, and **GST Exempt / Nil Rated (0%)**.
- **Bidirectional Rate Entry**: Type into any of the four pricing fields on a line item and all related fields update automatically:
  - **Rate (Excl. ₹)**: Unit price before GST.
  - **Rate (Incl. ₹)**: Tax-inclusive unit price (automatically back-calculates the base rate and GST).
  - **Taxable Value (₹)**: Total pre-tax line value.
  - **Total (Incl. ₹)**: Final tax-inclusive line total.
- **Tax-Compliant Final-Value Discounts**:
  - Discounts (both line-item and additional invoice-level discounts) are entered in Rupees (`₹`) as a reduction on the final payable amount.
  - Billuminati automatically scales down the pre-tax **Taxable Value** ($\text{Discount on Taxable Value} = \frac{\text{Discount}}{1 + \text{GST Rate}}$) and recalculates GST on the discounted taxable value so that `Taxable Value + GST = Final Payable Amount`.
  - In the **Invoice Editor**, the exact **Discount on taxable value** is shown in small font directly below each discount input.
  - In the **PDF Invoice**, only the **discount on taxable value** is displayed (positioned between **Rate (Excl)** and **Taxable Val** in the line-items table, with **Subtotal** reflecting line-item discounts already deducted so it matches the sum of the **Taxable Val** column, followed by **Additional Invoice Discount** when applicable).

### 2. Cash Customer & Payment Settlement Tracking
- **Cash Customer Mode**: Check **Cash Customer (No Buyer Details)** to issue counter/cash invoices immediately without entering buyer company name, GSTIN, or address details.
- **Payment Status & Due Date Automation**: Choose between **Pending**, **Paid**, and **Overdue**. Setting an invoice status to **Paid** automatically clears and disables the **Due Date** field and enables the **Payment Method & Settlement Details** section.
- **Payment Method, Date & Reference Details**: When an invoice is marked **Paid**, optionally record the **Payment Method** (**Direct Bank Transfer**, **UPI**, **Cash**, **Cheque**, or **Others (Specify)**), **Payment Date**, and transaction reference details (UTR #, UPI Transaction ID, Cheque No., etc.). Selecting **Pending** or **Overdue** automatically disables and clears the payment method, payment date, and reference fields.

### 3. Industrial Packaging & Quick-Add Item Catalog
- **25+ Packaging Units**: Includes `Unit`, `Piece`, `Box`, `Carton`, `Bucket`, `Tin`, `Bottle`, `Jar`, `Can`, `Drum`, `Barrel`, `Bag`, `Sack`, `Pouch`, `Pack`, `Bundle`, `Roll`, `Tube`, `Crate`, `Pallet`, `Cylinder`, `Container`, `Set`, `Pair`, and `Dozen`.
- **Saved Item Catalog (Tax-Inclusive)**: Save frequently billed items in **Item Catalog** by entering their **tax-inclusive unit price (`₹`)** and **GST rate (`%`)**. Click any preset in the editor's **Quick Add** bar to insert it into an invoice.

### 4. Print-Ready PDF Export (`IBM Plex Serif`) & Automatic Square Seller Logo
- **Embedded `IBM Plex Serif` Typography**: Both the live PDF preview sheet and downloaded PDF files use embedded **IBM Plex Serif** (Regular & Bold) for crisp, archival-grade print output.
- **Automatic Square Seller Logo Processing**: Upload any company logo in **Seller Profile** or **PDF Page Settings**. If the image is non-square, Billuminati automatically expands the canvas to a square (`1:1`) without stretching or changing the logo's aspect ratio, and downscales it to `512×512px` before saving. Toggle logo visibility on or off per invoice.
- **Customizable Page Layout**: Choose paper size (`A4`, `Letter`, `Legal`), orientation (`Portrait`, `Landscape`), margin density (`Compact`, `Standard`, `Wide`), accent color, and toggleable columns (`HSN/SAC`, `Packaging`, `Discount`, `GST Slab Summary`, `Amount in Words`, `Bank Details`, `Signature Block`).

### 5. Portable JSON Export & Import
- **Zero Lock-In**: All invoices, seller defaults, bank remittance details, square logo data, default terms & conditions, and catalog items are stored locally in your browser (`localStorage`) and can be exported to a single `.json` file at any time.
- **Merge or Replace**: Import a `.json` backup file (or paste raw JSON directly) in **Merge** mode (combines with your existing ledger) or **Replace** mode (restores an archive cleanly).

---

## Getting Started

### Prerequisites
- **Node.js** `v18+` (recommended `v20+`)
- **npm** `v9+`

### Installation & Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/DoctorLestrange/Billuminati.git
   cd Billuminati
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server on port `3000` |
| `npm run build` | Builds the production bundle into `dist/` |
| `npm run preview` | Previews the production build locally |
| `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`) |
| `npx tsx --test src/utils/billing.test.ts` | Runs the unit test suite for GST math, discounts, logo squaring, and JSON backups |

---

## Usage Guide

1. **Configure Your Business Profile & Logo**:
   - Click **Seller Profile** in the top navigation bar (or **JSON Backup & Defaults** → **Default Seller & Logo**).
   - Upload your **Seller Brand Logo** (automatically squared and scaled to `512×512px`), enter your company name, GSTIN, address, bank account/IFSC details, and optional default Terms & Conditions, then click **Save Default Profile**.
2. **Manage Saved Catalog Items**:
   - Click **Item Catalog** in the top navigation bar.
   - Enter the item name, HSN/SAC code, packaging type (`Bucket`, `Tin`, `Bottle`, `Box`, etc.), **Unit Price (Incl. Tax ₹)**, and **Tax (%)**, then click **Add Preset**.
3. **Create a GST Tax Invoice**:
   - Click **New Bill** or **New Tax Invoice**.
   - Select the **Payment Status** (`Pending`, `Paid`, or `Overdue`) and **GST Supply Type** (`CGST + SGST`, `IGST`, or `Exempt`).
   - When **Paid** is selected, optionally specify a **Payment Method** (`Direct Bank Transfer`, `UPI`, `Cash`, `Cheque`, or `Others`), **Payment Date**, and reference details.
   - Enter **Buyer / Billed-To Details**, or check **Cash Customer (No Buyer Details)** for counter sales.
   - Add line items from the **Quick Add** bar or enter rates (Exclusive or Inclusive of GST) and rupee discounts.
4. **Preview & Export PDF**:
   - Click **Preview & Export PDF** to inspect the formatted invoice in **IBM Plex Serif**, customize columns or page margins if needed, and click **Download PDF**.
5. **Backup & Restore Data**:
   - Click **JSON Data** in the top navigation bar to export a `.json` backup of your entire workspace or restore from an existing `.json` file.

---

## License

Apache-2.0
