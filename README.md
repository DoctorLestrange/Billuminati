<div align="center">

<a href="https://billuminati.ai.studio">
  <img src="./img_resources/billuminati_logo_complete_with_border.png" alt="Billuminati — GST Tax Invoice & Billing Studio" width="640" />
</a>

<br />

<h3>Free, Open-Source Indian GST Tax Invoice &amp; Billing Studio</h3>

<p>
  Fast, uncluttered, offline-capable GST invoicing with bidirectional pricing, 1-to-1 print-ready <strong>IBM Plex Serif</strong> PDF export, and portable JSON backups — running 100% in your browser with zero sample clutter.
</p>

<p>
  <a href="https://billuminati.ai.studio">
    <img src="https://img.shields.io/badge/Live%20Demo-billuminati.ai.studio-18181b?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" />
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-2563eb?style=for-the-badge" alt="Apache 2.0 License" />
  </a>
  <a href="https://github.com/DoctorLestrange/Billuminati/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/DoctorLestrange/Billuminati/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI Status" />
  </a>
  <img src="https://img.shields.io/badge/React-19-0f172a?style=for-the-badge&logo=react&logoColor=61dafb" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Local--First-059669?style=for-the-badge" alt="100% Local-First" />
</p>

<p>
  <a href="https://billuminati.ai.studio"><strong>Launch Live App</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="#interface-preview">Screenshots</a>
  &nbsp;&middot;&nbsp;
  <a href="#key-features">Features</a>
  &nbsp;&middot;&nbsp;
  <a href="#getting-started">Quick Start</a>
  &nbsp;&middot;&nbsp;
  <a href="#deployment">Deployment</a>
  &nbsp;&middot;&nbsp;
  <a href="#contributing">Contributing</a>
  &nbsp;&middot;&nbsp;
  <a href="#legal-disclaimer-assumption-of-risk--limitation-of-liability">Disclaimer</a>
</p>

</div>

---

## Interface Preview

### Billing Dashboard & Tax Invoice Ledger
Track total billed volume, collected revenue, pending receivables, and overdue balances with instant search, date presets, status filtering, and dark/light themes.

<p align="center">
  <img src="./screenshots/screenshot_preview_1.png" alt="Billuminati Billing Dashboard and Tax Invoice Ledger" width="100%" />
</p>

### Live Print-Ready GST Tax Invoice PDF Preview
Inspect your exact invoice layout in embedded **IBM Plex Serif** before downloading—complete with itemized CGST/SGST/IGST columns, discounts positioned between Rate and Taxable Value, GST slab summaries, amount in Indian Rupee words, and bank remittance details.

<p align="center">
  <img src="./screenshots/screenshot_preview_2.png" alt="Billuminati Live Print-Ready GST Tax Invoice PDF Preview" width="100%" />
</p>

---

## Key Features

### 1. Clean Start & Local-First Privacy
- **Zero Sample Clutter**: Starts with an empty invoice ledger, blank seller/bank profile, and empty item catalog so you can configure your business immediately.
- **100% Browser-Local Storage**: Zero accounts, zero servers, and zero telemetry. All records live in your browser's `localStorage` and can be exported or restored as portable `.json` files anytime.

### 2. Indian GST Compliance & Bidirectional Pricing
- **GST Supply Regimes**: Supports **CGST + SGST (Intra-State)**, **IGST (Inter-State)**, and **GST Exempt / Nil Rated (0%)** with automatic Indian Rupee (`Lakh` / `Crore`) formatting and amount-in-words conversion.
- **Dynamic Bidirectional Entry**: Edit any pricing field on a line item—**Rate (Excl. ₹)**, **Rate (Incl. ₹)**, **Taxable Value (₹)**, or **Total (Incl. ₹)**—and all dependent rates and taxes recalculate automatically.
- **Tax-Compliant Final-Value Discounts**: Enter line-item or additional invoice discounts in Rupees (`₹`) on the final payable amount; Billuminati scales down the pre-tax **Taxable Value** and recalculates GST so `Taxable Value + GST = Final Payable Amount` and table taxable totals match the subtotal cleanly.

### 3. Cash Customer & Payment Settlement Tracking
- **Cash Customer Mode**: Issue direct counter/cash invoices immediately without filling in buyer company name, GSTIN, or billing address.
- **Status & Settlement Automation**: Track **Pending**, **Paid**, and **Overdue** invoices with automatic due-date clearing and optional settlement tracking (`Direct Bank Transfer`, `UPI`, `Cash`, `Cheque`, or `Others`, plus payment date and reference) when marked **Paid**.

### 4. Packaging Units & Tax-Inclusive Item Catalog
- **Packaging Breakdown**: Supports **25+ industrial & retail units** (`Box`, `Carton`, `Drum`, `Roll`, `Bucket`, `Tin`, `Bottle`, `Bag`, `Pallet`, etc.).
- **Quick-Add Item Catalog**: Save frequently billed items using their **tax-inclusive unit price (`₹`)** and **GST rate (`%`)** for one-click insertion into new bills.

### 5. Print-Ready PDF Export & Automatic Square Seller Logo
- **1-to-1 Preview & Export Fidelity**: Both the live preview sheet and exported PDFs render in embedded **IBM Plex Serif** (Regular & Bold) with automatic multi-line wrapping and font-size adaptation for long item names.
- **Automatic Square Logo Processing**: Upload any brand logo—non-square logos are padded onto a `1:1` square canvas without distortion and scaled to `512×512px`.
- **Flexible Page Layout**: Customize paper size (`A4`, `Letter`, `Legal`), orientation (`Portrait`, `Landscape`), margin density, accent palette, and toggleable invoice blocks.

### 6. Portable JSON Backup & Restore
- **Zero Lock-In**: Export all invoices, seller defaults, bank details, square logo data, default terms, and saved catalog items to a single `.json` file, and restore in **Merge** or **Replace** mode.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | React 19 + TypeScript |
| **Build Tool** | Vite 8 |
| **Styling** | Tailwind CSS v4 (Light & Graphite Dark themes) |
| **PDF Engine** | `jsPDF` with embedded `IBM Plex Serif` TrueType font data |
| **Icons** | `lucide-react` |
| **Testing** | Node.js built-in test runner (`node:test`) via `tsx` |
| **Persistence** | Browser `localStorage` + schema-validated JSON export/import |

---

## Project Structure

```text
Billuminati/
├── .github/
│   ├── ISSUE_TEMPLATE/         # Bug report & feature request templates
│   ├── workflows/              # CI (typecheck, test, build) & GitHub Pages deploy
│   └── PULL_REQUEST_TEMPLATE.md
├── img_resources/              # Brand logo artwork
├── public/                     # Static assets copied to dist/ (logo.svg, og-image.png, robots.txt, sitemap.xml)
├── screenshots/                # Application preview screenshots
├── src/
│   ├── components/
│   │   ├── DashboardView.tsx       # KPI strip, search/date/status filters, invoice ledger
│   │   ├── DataSettingsModal.tsx   # JSON backup/restore, Seller Profile & Logo, Item Catalog
│   │   ├── InvoiceEditorView.tsx   # Bidirectional GST line-item editor & settlement form
│   │   ├── PdfPreviewModal.tsx     # Live print-ready PDF preview & page layout controls
│   │   └── WelcomeModal.tsx        # One-time first-visit notice & setup prompt
│   ├── data/
│   │   └── seedData.ts             # Clean empty workspace defaults
│   ├── types/
│   │   └── billing.ts              # Core TypeScript domain types & packaging constants
│   ├── utils/
│   │   ├── billing.ts              # Pure GST math, discount scaling, formatting & JSON validation
│   │   ├── billing.test.ts         # Automated unit tests for calculations & backups
│   │   ├── ibmPlexSerifFont.ts     # Embedded IBM Plex Serif font registration for jsPDF
│   │   └── pdfGenerator.ts         # Deterministic jsPDF renderer matching live preview
│   ├── App.tsx                 # Top-level workspace state, routing & localStorage persistence
│   ├── index.css               # Tailwind v4 theme tokens & typography utilities
│   └── main.tsx                # Application entry point
├── index.html                  # SEO metadata, OpenGraph/Twitter cards & JSON-LD schema
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites
- **Node.js** `v20.19+` (recommended `v22+` or `v24`)
- **npm** `v10+`

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/DoctorLestrange/Billuminati.git
cd Billuminati

# 2. Install dependencies
npm install

# 3. Start the development server on http://localhost:3000
npm run dev
```

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server at `http://localhost:3000` |
| `npm run build` | Builds the static production bundle into `dist/` |
| `npm run preview` | Serves the compiled `dist/` bundle locally for verification |
| `npm run lint` | Runs strict TypeScript type-checking (`tsc --noEmit`) |
| `npm test` | Runs the unit test suite (`src/utils/billing.test.ts`) for GST math, discounts, logo squaring, and JSON backups |
| `npm run clean` | Removes the `dist/` build output directory |

---

## Usage Guide

1. **Configure Your Business Profile & Logo**: Open **Seller Profile** in the top navigation bar, upload your brand logo (auto-squared to `512×512px`), enter your company name, GSTIN, address, bank/IFSC details, and optional default Terms & Conditions, then click **Save Default Profile**.
2. **Add Quick-Fill Catalog Presets**: Open **Item Catalog**, enter the item name, HSN/SAC code, packaging unit, **Unit Price (Incl. Tax ₹)**, and **Tax (%)**, then click **Add Preset**.
3. **Create a GST Tax Invoice**: Click **New Bill**, choose the **Payment Status** and **GST Supply Type**, enter buyer details (or check **Cash Customer**), and add line items or rupee discounts.
4. **Preview & Export PDF**: Click **Preview & Export PDF** to review the formatted **IBM Plex Serif** document, adjust layout options if desired, and click **Download PDF**.
5. **Back Up & Restore Data**: Open **JSON Data** to download a complete `.json` snapshot of your workspace or restore from an existing backup in **Merge** or **Replace** mode.

---

## Deployment

Because Billuminati is a **100% static client-side web application** with no backend server or API keys required, you can host the `dist/` folder on any static hosting provider:

| Platform | Configuration |
| :--- | :--- |
| **Live Hosted Instance** | [https://billuminati.ai.studio](https://billuminati.ai.studio) |
| **GitHub Pages** | Enable **Settings &rarr; Pages &rarr; Source: GitHub Actions**. The included [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) workflow automatically builds with `VITE_BASE_PATH=/<repo-name>/` and publishes on pushes to `main`. |
| **Vercel / Netlify / Cloudflare Pages** | Connect your GitHub repository with Build Command `npm run build` and Output Directory `dist` (no environment variables required). |
| **Self-Hosted Static Server** | Run `npm run build` and serve the `dist/` directory with Nginx, Caddy, Apache, or any static file server. |

---

## Contributing

Contributions, bug reports, and feature suggestions are welcome!

- Read our [Contributing Guidelines](./CONTRIBUTING.md) before opening a pull request.
- Follow our [Code of Conduct](./CODE_OF_CONDUCT.md) in all discussions.
- See [SECURITY.md](./SECURITY.md) for privacy details and vulnerability reporting.
- Track release highlights in [CHANGELOG.md](./CHANGELOG.md).

---

## ⚠️ Legal Disclaimer, Assumption of Risk & Limitation of Liability

**Billuminati** ([https://github.com/DoctorLestrange/Billuminati](https://github.com/DoctorLestrange/Billuminati)) is an open-source, AI-generated application provided strictly **"AS IS"**. Use it at your own risk and verify all tax calculations and invoices independently; the developer is in no way responsible or liable for anything arising from its use.

<details>
<summary><strong>Read Full Legal Disclaimer, Assumption of Risk &amp; Limitation of Liability (Click to expand)</strong></summary>
<br />

**PLEASE READ CAREFULLY BEFORE USING, MODIFYING, OR DISTRIBUTING THIS SOFTWARE:**

1. **Open-Source AI-Generated Software**: **Billuminati** (source code available at [https://github.com/DoctorLestrange/Billuminati](https://github.com/DoctorLestrange/Billuminati)) is an **open-source, AI-generated application** released strictly for general informational, educational, and utility purposes.
2. **Beta Application**: This application is incomplete and in testing, hence, prone to bugs, errors, and inconsistencies.
3. **Use Strictly at Your Own Risk**: Any and all actions, invoices, tax calculations, filings, documents, financial records, or business transactions created, exported, printed, or managed using this application are **100% the user's own doing and sole responsibility**. You must exercise extreme caution, due diligence, and independent verification before relying on any output generated by this software.
4. **No Tax, Legal, Accounting, or Financial Advice**: Nothing in this software or repository constitutes professional tax, legal, accounting, chartered accountancy, or statutory GST compliance advice. Tax laws, GST rules, HSN/SAC rates, invoicing mandates, e-invoicing regulations, and rounding rules are subject to change and interpretation. You are solely responsible for verifying that every invoice, tax rate, discount calculation, and document complies with applicable local, state, and national laws and regulations (including Indian GST laws).
5. **Provided "AS IS" Without Warranties**: This software is provided **"AS IS"** and **"AS AVAILABLE"**, without warranty or representation of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, accuracy, completeness, reliability, regulatory compliance, data persistence, or non-infringement. Because all data is stored locally in the user's browser (`localStorage`), the developer does not host, back up, or guarantee the retention or security of your data.
6. **Complete Waiver & Limitation of Liability**: Under **no circumstances** and under **no legal theory** (whether in contract, tort, negligence, strict liability, statute, or otherwise) shall the developer, repository owner (`DoctorLestrange`), contributors, or maintainers be held responsible or liable in any way whatsoever for any direct, indirect, incidental, special, exemplary, punitive, or consequential damages, financial losses, tax penalties, statutory fines, audit liabilities, calculation discrepancies, lost profits, data loss, business interruption, or legal disputes arising out of or in connection with the use, misuse, or inability to use this software—even if advised of the possibility of such damages. **By using this software, you unconditionally agree to assume all risks and hold the developer harmless from any and all claims.**

</details>

---

## License

Licensed under the [MIT License](./LICENSE).
