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
        </div>
      </div>

      <div v-if="activeTab === 'txt'" class="preview-area">
        <pre>{{ exportText }}</pre>
      </div>

      <div v-else class="preview-area">
        <p class="csv-hint">CSV ready for Excel, QuickBooks, or any accounting software.</p>
        <pre class="csv-preview">{{ csvPreview }}</pre>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" @click="emit('close')">Close</button>
        <button class="btn-secondary" @click="copyToClipboard">
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
      </div>
    </div>
  </div>
</template>
