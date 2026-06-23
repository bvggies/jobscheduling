#!/usr/bin/env node
/**
 * Generates docs/JobScheduler-System-Guide.pdf from README.md
 * Usage: node scripts/generate-readme-pdf.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const readmePath = path.join(root, 'README.md');
const htmlPath = path.join(root, 'docs', 'system-guide.html');
const pdfPath = path.join(root, 'docs', 'JobScheduler-System-Guide.pdf');

const PRINT_CSS = `
@page { size: A4; margin: 18mm 16mm 22mm 16mm; }
* { box-sizing: border-box; }
html { font-size: 11pt; }
body {
  font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  color: #1e293b;
  line-height: 1.55;
  margin: 0;
  background: #fff;
}
.cover {
  page-break-after: always;
  min-height: 250mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: linear-gradient(145deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%);
  color: #fff;
  padding: 24mm;
  margin: -18mm -16mm 0;
  width: calc(100% + 32mm);
}
.cover-badge {
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-size: 9pt;
  opacity: 0.85;
  margin-bottom: 12mm;
}
.cover h1 {
  font-size: 34pt;
  font-weight: 700;
  margin: 0 0 6mm;
  letter-spacing: -0.02em;
}
.cover .tagline {
  font-size: 13pt;
  max-width: 130mm;
  opacity: 0.92;
  margin-bottom: 14mm;
  line-height: 1.5;
}
.cover-meta {
  font-size: 9.5pt;
  opacity: 0.8;
  border-top: 1px solid rgba(255,255,255,0.25);
  padding-top: 8mm;
  width: 100%;
  max-width: 140mm;
}
.content { padding: 0; }
h1, h2, h3, h4 { color: #0f172a; page-break-after: avoid; }
h1 { font-size: 22pt; margin: 0 0 4mm; padding-bottom: 3mm; border-bottom: 3px solid #2563eb; }
h2 {
  font-size: 15pt;
  margin: 10mm 0 4mm;
  padding: 3mm 4mm;
  background: #eff6ff;
  border-left: 4px solid #2563eb;
  page-break-before: always;
  page-break-after: avoid;
}
.content > h2:first-of-type,
.toc-section h2 { page-break-before: avoid; }
h3 { font-size: 12pt; margin: 6mm 0 3mm; color: #1e40af; }
h4 { font-size: 10.5pt; margin: 4mm 0 2mm; }
p { margin: 0 0 3mm; }
ul, ol { margin: 0 0 4mm; padding-left: 6mm; }
li { margin-bottom: 1.5mm; }
a { color: #2563eb; text-decoration: none; }
hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 8mm 0;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin: 4mm 0 6mm;
  font-size: 9.5pt;
  page-break-inside: auto;
}
thead { display: table-header-group; }
tr { page-break-inside: avoid; }
th {
  background: #1e40af;
  color: #fff;
  font-weight: 600;
  text-align: left;
  padding: 2.5mm 3mm;
}
td {
  border: 1px solid #cbd5e1;
  padding: 2.5mm 3mm;
  vertical-align: top;
}
tbody tr:nth-child(even) td { background: #f8fafc; }
code {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 8.5pt;
  background: #f1f5f9;
  padding: 0.5mm 1.5mm;
  border-radius: 2px;
  color: #0f172a;
}
pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 4mm;
  border-radius: 3mm;
  overflow-x: auto;
  font-size: 8pt;
  line-height: 1.45;
  page-break-inside: avoid;
  margin: 3mm 0 5mm;
}
pre code { background: transparent; color: inherit; padding: 0; }
.diagram {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 3mm;
  padding: 4mm;
  margin: 4mm 0 6mm;
  page-break-inside: avoid;
  display: flex;
  justify-content: center;
  overflow: hidden;
}
.diagram svg { max-width: 100% !important; height: auto !important; }
.toc-section { page-break-after: always; }
.toc-section h2 { background: none; border: none; padding: 0; }
.toc-section ol { font-size: 11pt; line-height: 1.8; }
.toc-section a { color: #1e293b; }
.section-block { page-break-inside: avoid; }
strong { color: #0f172a; }
`;

function buildHtml(markdownBody) {
  const generated = new Date().toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>JobScheduler System Guide</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="cover">
    <div class="cover-badge">Print Shop Operations Platform</div>
    <h1>JobScheduler</h1>
    <p class="tagline">
      Service catalog &amp; instant pricing · MoMo deposits · Appointment slots ·
      Production scheduling · Team chat · Analytics
    </p>
    <div class="cover-meta">
      System documentation · Tech stack · API reference · Price list (GHS)<br/>
      github.com/bvggies/jobscheduling · Generated ${generated}
    </div>
  </div>
  <div class="content">
    ${markdownBody}
  </div>
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
    mermaid.initialize({
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        primaryColor: '#dbeafe',
        primaryTextColor: '#0f172a',
        primaryBorderColor: '#2563eb',
        lineColor: '#475569',
        secondaryColor: '#f1f5f9',
        tertiaryColor: '#fff',
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: '13px',
      },
      flowchart: { htmlLabels: true, curve: 'basis' },
      securityLevel: 'loose',
    });
    await mermaid.run({ querySelector: '.mermaid' });
    document.body.setAttribute('data-mermaid-ready', 'true');
  </script>
</body>
</html>`;
}

async function main() {
  if (!fs.existsSync(readmePath)) {
    console.error('README.md not found');
    process.exit(1);
  }

  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });

  const markdown = fs.readFileSync(readmePath, 'utf8');

  const renderer = {
    code({ text, lang }) {
      if (lang === 'mermaid') {
        return `<div class="diagram"><pre class="mermaid">${text}</pre></div>`;
      }
      const escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre><code>${escaped}</code></pre>`;
    },
  };

  marked.use({ renderer });

  let body = marked.parse(markdown);

  // Wrap table of contents for page break
  body = body.replace(
    /<h2 id="table-of-contents">[\s\S]*?(?=<h2 id="system-at-a-glance">)/,
    (match) => `<div class="toc-section">${match}</div>`
  );

  const html = buildHtml(body);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('Wrote', htmlPath);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0', timeout: 120000 });

    await page.waitForFunction(
      () => document.body.getAttribute('data-mermaid-ready') === 'true',
      { timeout: 120000 }
    );

    // Extra beat for SVG layout
    await new Promise((r) => setTimeout(r, 1500));

    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%;font-size:8px;padding:0 14mm;color:#64748b;font-family:Segoe UI,sans-serif;">
          <span style="float:left;">JobScheduler System Guide</span>
          <span style="float:right;">Print Shop Platform</span>
        </div>`,
      footerTemplate: `
        <div style="width:100%;font-size:8px;padding:0 14mm;color:#64748b;text-align:center;font-family:Segoe UI,sans-serif;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
    });

    const stats = fs.statSync(pdfPath);
    console.log(`Wrote ${pdfPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
