# Security Policy

## Privacy & Local-First Architecture

**Billuminati** is a 100% client-side web application:

- **No Backend Database or Cloud Sync**: Invoices, buyer/seller GSTIN details, bank remittance records, brand logos, and catalog presets are stored solely in your local browser (`localStorage`).
- **No Telemetry or Analytics**: Billuminati does not transmit your financial records, invoices, or business details to external servers.
- **Portable Backups**: Because browser storage can be cleared when clearing site data or switching devices, users are strongly encouraged to regularly export `.json` backups via **JSON Data**.
- **External Resources**: Web fonts (`IBM Plex Serif`, `Lora`, `Plus Jakarta Sans`, `JetBrains Mono`) are loaded from Google Fonts for UI typography; PDF exports embed `IBM Plex Serif` locally inside the bundle.

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `1.x` (`main`) | Yes |

## Reporting a Vulnerability

If you discover a security vulnerability (for example, an XSS issue in JSON import parsing, PDF generation, or logo handling), please report it responsibly:

1. **Preferred**: Use GitHub's private [Security Advisories](https://github.com/DoctorLestrange/Billuminati/security/advisories/new) feature on this repository so the issue can be investigated before public disclosure.
2. **Alternative**: Open an issue without disclosing exploit details and request a private channel from the maintainer.

Please include:
- A clear description of the vulnerability and potential impact
- Steps to reproduce (and minimal payload or JSON fixture if applicable)
- Browser and version details

Thank you for helping keep Billuminati and its users safe.
