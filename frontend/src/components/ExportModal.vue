<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  expenses: { type: Array, required: true },
  summary: { type: Object, required: true }
});

const emit = defineEmits(['close']);
const activeTab = ref('txt');
const copied = ref(false);

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ── TXT Report ──
const exportText = computed(() => {
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const dates = props.expenses.map(e => new Date(e.created_at));
  const from = dates.length ? new Date(Math.min(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const to = dates.length ? new Date(Math.max(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const groups = {};
  for (const exp of props.expenses) {
    if (!groups[exp.category]) groups[exp.category] = [];
    groups[exp.category].push(exp);
  }

  let text = `EXPENSE SUMMARY FOR CPA\n`;
  text += `Generated: ${now}\n`;
  if (from && to) text += `Period: ${from} - ${to}\n`;
  text += `${'='.repeat(55)}\n\n`;

  for (const [category, items] of Object.entries(groups).sort()) {
    const catTotal = items.reduce((s, e) => s + Number(e.amount), 0);
    const catDeductible = items.filter(e => e.deductible === 'Likely deductible').reduce((s, e) => s + Number(e.amount), 0);
    const catPartial = items.filter(e => e.deductible === 'Partially deductible').reduce((s, e) => s + Number(e.amount), 0);

    text += `${category.toUpperCase()}: ${fmt(catTotal)}`;
    if (catPartial > 0) text += `  (${fmt(catPartial)} at 50%)`;
    text += `\n`;
    text += `${'-'.repeat(55)}\n`;

    for (const item of items) {
      text += `  ${item.name.padEnd(30)} ${fmt(item.amount).padStart(10)}  [${item.deductible}]\n`;
      if (item.note) text += `    ${item.note}\n`;
    }
    text += '\n';
  }

  text += `${'='.repeat(55)}\n`;
  text += `TOTALS\n`;
  text += `  Total Expenses:          ${fmt(props.summary.total)}\n`;
  text += `  Likely Deductible:       ${fmt(props.summary.deductible)}\n`;
  text += `  Partially Deductible:    ${fmt(props.summary.partial)}\n`;
  text += `    Estimated at 50%:      ${fmt(props.summary.partial * 0.5)}\n`;
  text += `  Likely Not Deductible:   ${fmt(props.summary.notDeductible)}\n`;
  text += `${'-'.repeat(55)}\n`;
  const estimatedDeduction = props.summary.deductible + (props.summary.partial * 0.5);
  text += `  Est. Total Deduction:    ${fmt(estimatedDeduction)}\n`;
  text += `${'='.repeat(55)}\n\n`;
  text += `DISCLAIMER: This is not tax advice. Please consult a CPA.\n`;

  return text;
});

// ── CSV ──
const exportCSV = computed(() => {
  const headers = ['Date', 'Name', 'Amount', 'Category', 'Deductible', 'Est. Deductible Amount', 'Note', 'Original Text'];

  const rows = props.expenses.map(exp => {
    const amount = Number(exp.amount);
    let estDeductible = 0;
    if (exp.deductible === 'Likely deductible') estDeductible = amount;
    else if (exp.deductible === 'Partially deductible') estDeductible = amount * 0.5;

    return [
      fmtDate(exp.created_at),
      `"${(exp.name || '').replace(/"/g, '""')}"`,
      amount.toFixed(2),
      `"${exp.category}"`,
      `"${exp.deductible}"`,
      estDeductible.toFixed(2),
      `"${(exp.note || '').replace(/"/g, '""')}"`,
      `"${(exp.original_text || '').replace(/"/g, '""')}"`
    ].join(',');
  });

  // Summary rows at the bottom
  const estimatedDeduction = props.summary.deductible + (props.summary.partial * 0.5);
  const summaryRows = [
    '',
    'SUMMARY,,,,,,',
    `Total Expenses,,${props.summary.total.toFixed(2)},,,,`,
    `Likely Deductible,,${props.summary.deductible.toFixed(2)},,,,`,
    `Partially Deductible,,${props.summary.partial.toFixed(2)},,,,`,
    `Partial at 50%,,${(props.summary.partial * 0.5).toFixed(2)},,,,`,
    `Not Deductible,,${props.summary.notDeductible.toFixed(2)},,,,`,
    `Est. Total Deduction,,${estimatedDeduction.toFixed(2)},,,,`,
    '',
    '"DISCLAIMER: This is not tax advice. Please consult a CPA.",,,,,,',
  ];

  return [headers.join(','), ...rows, ...summaryRows].join('\n');
});

// ── Preview for CSV tab ──
const csvPreview = computed(() => {
  const lines = exportCSV.value.split('\n');
  if (lines.length <= 15) return exportCSV.value;
  return [...lines.slice(0, 8), '...', ...lines.slice(-8)].join('\n');
});

function copyToClipboard() {
  const content = activeTab.value === 'txt' ? exportText.value : exportCSV.value;
  navigator.clipboard.writeText(content);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
}

function downloadFile(type) {
  const dateStr = new Date().toISOString().slice(0, 10);
  let blob, filename;

  if (type === 'csv') {
    // Add BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF';
    blob = new Blob([bom + exportCSV.value], { type: 'text/csv;charset=utf-8' });
    filename = `expense-summary-${dateStr}.csv`;
  } else {
    blob = new Blob([exportText.value], { type: 'text/plain' });
    filename = `expense-summary-${dateStr}.txt`;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF Export (via browser print dialog → Save as PDF) ──
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPdfHtml() {
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const dates = props.expenses.map(e => new Date(e.created_at));
  const from = dates.length ? new Date(Math.min(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const to = dates.length ? new Date(Math.max(...dates)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  const groups = {};
  for (const exp of props.expenses) {
    if (!groups[exp.category]) groups[exp.category] = [];
    groups[exp.category].push(exp);
  }

  const estimatedDeduction = props.summary.deductible + (props.summary.partial * 0.5);

  let categoriesHtml = '';
  for (const [category, items] of Object.entries(groups).sort()) {
    const catTotal = items.reduce((s, e) => s + Number(e.amount), 0);
    const catPartial = items.filter(e => e.deductible === 'Partially deductible').reduce((s, e) => s + Number(e.amount), 0);

    categoriesHtml += `
      <h2 class="category">
        ${escapeHtml(category.toUpperCase())}
        <span class="cat-total">${escapeHtml(fmt(catTotal))}${catPartial > 0 ? ` <small>(${escapeHtml(fmt(catPartial))} at 50%)</small>` : ''}</span>
      </h2>
      <table class="items">
        <thead>
          <tr>
            <th>Date</th>
            <th>Item</th>
            <th class="num">Amount</th>
            <th>Deductible</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>${escapeHtml(fmtDate(item.created_at))}</td>
              <td>
                ${escapeHtml(item.name)}
                ${item.note ? `<div class="note">${escapeHtml(item.note)}</div>` : ''}
              </td>
              <td class="num">${escapeHtml(fmt(item.amount))}</td>
              <td>${escapeHtml(item.deductible)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Expense Summary for CPA</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      margin: 32px;
      font-size: 11pt;
      line-height: 1.4;
    }
    header { border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 20px; }
    header h1 { margin: 0 0 4px; font-size: 20pt; }
    header .meta { font-size: 9pt; color: #555; }
    h2.category {
      font-size: 12pt;
      margin: 18px 0 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid #999;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    h2.category .cat-total { font-weight: 600; }
    h2.category small { font-weight: 400; color: #666; font-size: 9pt; }
    table.items { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    table.items th, table.items td {
      text-align: left;
      padding: 4px 6px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
    }
    table.items th {
      font-size: 8pt;
      text-transform: uppercase;
      color: #555;
      border-bottom: 1px solid #999;
    }
    table.items td.num, table.items th.num { text-align: right; white-space: nowrap; }
    .note { font-size: 8.5pt; color: #666; margin-top: 2px; font-style: italic; }
    .totals {
      margin-top: 24px;
      border-top: 2px solid #1a1a1a;
      padding-top: 12px;
    }
    .totals h2 { margin: 0 0 8px; font-size: 13pt; }
    .totals table { width: 100%; border-collapse: collapse; }
    .totals td { padding: 4px 0; }
    .totals td.label { color: #444; }
    .totals td.value { text-align: right; font-weight: 600; }
    .totals tr.grand td {
      border-top: 1px solid #1a1a1a;
      padding-top: 8px;
      font-size: 12pt;
    }
    footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #ccc;
      font-size: 8.5pt;
      color: #666;
      font-style: italic;
    }
    @media print {
      body { margin: 0.5in; }
      h2.category { page-break-after: avoid; }
      table.items { page-break-inside: auto; }
      table.items tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Expense Summary for CPA</h1>
    <div class="meta">
      Generated: ${escapeHtml(now)}
      ${from && to ? ` &nbsp;|&nbsp; Period: ${escapeHtml(from)} – ${escapeHtml(to)}` : ''}
    </div>
  </header>

  ${categoriesHtml}

  <div class="totals">
    <h2>Totals</h2>
    <table>
      <tr><td class="label">Total Expenses</td><td class="value">${escapeHtml(fmt(props.summary.total))}</td></tr>
      <tr><td class="label">Likely Deductible</td><td class="value">${escapeHtml(fmt(props.summary.deductible))}</td></tr>
      <tr><td class="label">Partially Deductible</td><td class="value">${escapeHtml(fmt(props.summary.partial))}</td></tr>
      <tr><td class="label">&nbsp;&nbsp;&nbsp;Estimated at 50%</td><td class="value">${escapeHtml(fmt(props.summary.partial * 0.5))}</td></tr>
      <tr><td class="label">Likely Not Deductible</td><td class="value">${escapeHtml(fmt(props.summary.notDeductible))}</td></tr>
      <tr class="grand"><td class="label">Est. Total Deduction</td><td class="value">${escapeHtml(fmt(estimatedDeduction))}</td></tr>
    </table>
  </div>

  <footer>
    DISCLAIMER: This is not tax advice. Please consult a CPA.
  </footer>
</body>
</html>`;
}

function downloadPDF() {
  const html = buildPdfHtml();
  const win = window.open('', '_blank');
  if (!win) {
    alert('Please allow pop-ups to export as PDF.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Wait for the document to render before printing
  win.onload = () => {
    setTimeout(() => {
      win.print();
    }, 250);
  };
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h3>Export for Accountant</h3>
        <div class="tab-bar">
          <button
            :class="['tab', { active: activeTab === 'txt' }]"
            @click="activeTab = 'txt'"
          >
            TXT Report
          </button>
          <button
            :class="['tab', { active: activeTab === 'csv' }]"
            @click="activeTab = 'csv'"
          >
            CSV (Excel)
          </button>
          <button
            :class="['tab', { active: activeTab === 'pdf' }]"
            @click="activeTab = 'pdf'"
          >
            PDF
          </button>
        </div>
      </div>

      <div v-if="activeTab === 'txt'" class="preview-area">
        <pre>{{ exportText }}</pre>
      </div>

      <div v-else-if="activeTab === 'csv'" class="preview-area">
        <p class="csv-hint">CSV ready for Excel, QuickBooks, or any accounting software.</p>
        <pre class="csv-preview">{{ csvPreview }}</pre>
      </div>

      <div v-else class="preview-area">
        <p class="csv-hint">
          Formatted PDF report. Clicking <strong>Download .pdf</strong> opens the print dialog —
          choose <em>"Save as PDF"</em> as the destination.
        </p>
        <pre>{{ exportText }}</pre>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" @click="emit('close')">Close</button>
        <button
          v-if="activeTab !== 'pdf'"
          class="btn-secondary"
          @click="copyToClipboard"
        >
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
        <button
          v-if="activeTab === 'csv'"
          class="btn-primary"
          @click="downloadFile('csv')"
        >
          Download .csv
        </button>
        <button
          v-if="activeTab === 'txt'"
          class="btn-primary"
          @click="downloadFile('txt')"
        >
          Download .txt
        </button>
        <button
          v-if="activeTab === 'pdf'"
          class="btn-primary"
          @click="downloadPDF"
        >
          Download .pdf
        </button>
      </div>
    </div>
  </div>
</template>
