# Website QA Auditor

A production-ready Website QA Auditor that runs locally on Windows using Node.js and Playwright.

## Features

- **SEO Audit** - Title, meta description, H1, canonical, OG tags, Twitter cards
- **Schema Validation** - JSON-LD schema detection and validation
- **Content Audit** - Thin content, Lorem Ipsum, empty sections, word count
- **Link Audit** - Broken links, 404s, 500s, redirect chains, broken images
- **Form Testing** - Blank submission, email validation, required fields
- **UI Testing** - Overlapping elements, hidden buttons, truncated text, mobile responsiveness
- **JavaScript Monitoring** - Console errors, JS exceptions, failed network requests
- **Lighthouse Audit** - Performance, Accessibility, SEO, Best Practices scores
- **Axe Accessibility** - WCAG 2.0/2.1 violations, ARIA issues, contrast
- **Visual Regression** - Screenshot comparison with baselines
- **Report Generation** - HTML, PDF, CSV, JSON exports
- **Dashboard** - Scan history, trend charts, issue analytics

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Frontend | React + Vite |
| Browser Automation | Playwright |
| Performance | Lighthouse |
| Accessibility | Axe-Core |
| HTML Parsing | Cheerio |
| Database | SQLite (better-sqlite3) |
| PDF Reports | PDFKit |

## Project Structure

```
qatool/
├── backend/
│   └── src/
│       ├── server.js              # Express server entry point
│       ├── auditors/
│       │   ├── linkAuditor.js     # Link/image checking, sitemap crawl
│       │   ├── seoAuditor.js      # SEO, schema, content analysis
│       │   ├── formAuditor.js     # Form validation testing
│       │   ├── uiAuditor.js       # UI/layout issue detection
│       │   ├── lighthouseAuditor.js # Lighthouse performance audit
│       │   ├── accessibilityAuditor.js # Axe-core accessibility
│       │   └── visualRegression.js # Screenshot comparison
│       ├── routes/
│       │   ├── scan.js            # Scan start/progress/results API
│       │   ├── reports.js         # HTML/PDF/CSV/JSON export
│       │   └── history.js         # Scan history API
│       ├── reports/
│       │   ├── htmlReport.js      # HTML report generator
│       │   └── pdfReport.js       # PDF report generator
│       └── utils/
│           ├── browser.js         # Playwright browser utilities
│           ├── database.js        # SQLite setup
│           └── scanOrchestrator.js # Main scan coordinator
├── frontend/
│   └── src/
│       ├── App.jsx                # Router + layout
│       ├── pages/
│       │   ├── Dashboard.jsx      # Overview + trend charts
│       │   ├── NewScan.jsx        # Scan configuration
│       │   ├── ScanResults.jsx    # Results viewer
│       │   └── History.jsx        # Scan history
│       └── index.css              # Global dark theme styles
├── reports/                       # Generated HTML/PDF reports
├── screenshots/                   # Page screenshots
├── lighthouse/                    # Lighthouse JSON reports
├── database/                      # SQLite database file
├── setup.bat                      # One-time setup script
└── start.bat                      # Launch application
```

## Installation

### Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- Google Chrome (for Lighthouse)

### Setup (One Time)

```bat
setup.bat
```

This installs all dependencies and Playwright browsers.

### Start the Application

```bat
start.bat
```

Opens:
- Backend API: http://localhost:3001
- Frontend UI: http://localhost:5173 (auto-opens in browser)

## Usage

### Quick Scan
1. Click **New Scan**
2. Enter one or more URLs (one per line)
3. Select **Quick Scan** mode
4. Click **Start Scan**

### Full Scan
1. Click **New Scan**
2. Enter URLs
3. Select **Full Scan** mode (includes forms, UI, accessibility)
4. Click **Start Scan**

### Sitemap Scan
1. Enter your sitemap URL (e.g., `https://example.com/sitemap.xml`)
2. Enable **Sitemap Mode**
3. All discovered pages will be scanned

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scan/start` | Start a new scan |
| GET | `/api/scan/progress/:id` | Poll scan progress |
| GET | `/api/scan/results/:id` | Get scan results |
| POST | `/api/scan/crawl` | Crawl internal links |
| GET | `/api/history` | List all scans |
| GET | `/api/history/trends` | Get trend data |
| DELETE | `/api/history/:id` | Delete a scan |
| GET | `/api/reports/html/:id` | Download HTML report |
| GET | `/api/reports/pdf/:id` | Download PDF report |
| GET | `/api/reports/csv/:id` | Download CSV report |
| GET | `/api/reports/json/:id` | Download JSON report |

## Scan Modes

### Quick Scan (~30-60s per URL)
- SEO analysis (title, meta, H1, canonical, OG, Twitter)
- Schema markup detection
- Content audit (word count, Lorem Ipsum, empty sections)
- JavaScript error monitoring
- Lighthouse scores (Performance, Accessibility, SEO, Best Practices)
- Screenshots (desktop, tablet, mobile)

### Full Scan (~2-5min per URL)
Everything in Quick Scan, plus:
- Internal link audit (broken links, 404s, redirect chains)
- Form testing (blank submission, email validation)
- UI audit (overlapping elements, hidden buttons, mobile issues)
- Axe-Core accessibility (WCAG 2.0/2.1)
- Visual regression (baseline comparison)

## Reports

All reports are saved to the `/reports` directory and can be downloaded from the UI:

- **HTML Report** - Full visual report with screenshots and issue table
- **PDF Report** - Professional PDF suitable for client delivery
- **CSV Report** - Spreadsheet-compatible issue list
- **JSON Report** - Raw data for integration with other tools

## Troubleshooting

**Lighthouse fails**: Ensure Google Chrome is installed at the default location.

**Playwright errors**: Run `cd backend && npx playwright install chromium`

**Port conflicts**: Change ports in `backend/src/server.js` (PORT) and `frontend/vite.config.js`

**SQLite errors**: Delete `database/qa_auditor.db` to reset the database
