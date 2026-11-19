# Contributing to Billuminati

Thank you for your interest in contributing to **Billuminati**! Contributions of all kinds—bug fixes, GST math improvements, PDF layout enhancements, accessibility improvements, tests, and documentation—are warmly welcomed.

## Getting Started

1. **Fork the repository** on GitHub (`https://github.com/DoctorLestrange/Billuminati`).
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/Billuminati.git
   cd Billuminati
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Workflow

1. Create a descriptive branch from `main`:
   ```bash
   git checkout -b fix/pdf-long-item-wrapping
   # or
   git checkout -b feat/hsn-summary-export
   ```
2. Keep pure business logic (GST calculations, discount adjustments, number formatting, backup parsing) inside `src/utils/` so it remains decoupled from React components and easily unit-tested.
3. Add or update unit tests in `src/utils/billing.test.ts` whenever modifying billing math, invoice normalization, logo processing, or JSON import/export behavior.
4. Maintain 1-to-1 parity between the live preview (`src/components/PdfPreviewModal.tsx`) and exported PDFs (`src/utils/pdfGenerator.ts`) when modifying invoice layout or typography.

## Verification Checklist Before Opening a PR

Run all checks locally and ensure they pass without errors:

```bash
# 1. TypeScript type check
npm run lint

# 2. Unit test suite
npm test

# 3. Production build
npm run build
```

## Pull Request Guidelines

- Keep pull requests focused on a single feature or bug fix.
- Include clear before/after screenshots for UI or PDF rendering changes.
- Verify both **Light** and **Dark** themes if modifying UI components.
- Ensure no sample/hardcoded personal or business data is introduced into initial workspace defaults.

## Reporting Bugs & Requesting Features

- Use the [Bug Report](https://github.com/DoctorLestrange/Billuminati/issues/new?template=bug_report.md) template for bugs (especially calculation or PDF discrepancies—include sample numbers and GST regime).
- Use the [Feature Request](https://github.com/DoctorLestrange/Billuminati/issues/new?template=feature_request.md) template for enhancement ideas.

## License

By contributing to Billuminati, you agree that your contributions will be licensed under the [Apache License 2.0](./LICENSE).
