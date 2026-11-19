# Changelog

All notable changes to **Billuminati** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-11-18

### Added
- **Clean-Start Workspace**: Empty initial ledger, seller profile, bank details, and item catalog with zero dummy sample records.
- **One-Time First-Visit Welcome Modal**: Displays open-source / AI-generated project notice, repository link, and quick Seller Profile setup action once per browser.
- **Indian GST Billing Engine**:
  - Support for **CGST + SGST (Intra-State)**, **IGST (Inter-State)**, and **GST Exempt / Nil Rated (0%)**.
  - Bidirectional pricing across **Rate (Excl. ₹)**, **Rate (Incl. ₹)**, **Taxable Value (₹)**, and **Total (Incl. ₹)**.
  - Tax-compliant final-value rupee discounts for both line items and additional invoice discounts, ensuring taxable value column totals match the invoice subtotal.
  - Indian Rupee Lakh/Crore currency formatting and amount-in-words conversion.
- **Cash Customer & Payment Settlement Controls**:
  - One-click **Cash Customer** mode for counter sales without buyer metadata.
  - **Paid / Pending / Overdue** payment status controls with automatic due-date clearing and settlement tracking (payment method, payment date, reference details) when marked Paid, and automatic disabling/clearing when Pending or Overdue.
- **Packaging & Saved Item Catalog**:
  - 25+ industrial and retail packaging units.
  - Tax-inclusive saved catalog presets for one-click invoice line addition.
- **1-to-1 Print-Ready PDF Preview & Export**:
  - Embedded **IBM Plex Serif** (Regular & Bold) rendering across both live preview and `jsPDF` downloads.
  - Discount column positioned cleanly between Rate and Taxable Value, unambiguous **Payment Status** label, and automatic multi-line wrapping with font scaling for long item names.
  - Automatic `1:1` square padding and `512×512px` downscaling for uploaded seller brand logos.
  - Customizable paper size (`A4`, `Letter`, `Legal`), orientation, margin density, accent palette, and toggleable sections.
- **Portable JSON Export & Import**: Full workspace backup/restore supporting **Merge** and **Replace** modes with validation.
- **SEO & Publishing Readiness**: OpenGraph/Twitter social cards, JSON-LD `WebSite` + `WebApplication` schema, `robots.txt`, `sitemap.xml`, Apache 2.0 license, CI & GitHub Pages workflows, and community templates.
