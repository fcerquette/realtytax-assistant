<script setup>
defineProps({
  summary: {
    type: Object,
    required: true
  }
});

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="summary">
    <div class="summary-card total">
      <div class="label">Total Expenses</div>
      <div class="value">{{ fmt(summary.total) }}</div>
    </div>
    <div class="summary-card deductible">
      <div class="label">Likely Deductible</div>
      <div class="value">{{ fmt(summary.deductible) }}</div>
    </div>
    <div class="summary-card partial">
      <div class="label">Partially Deductible</div>
      <div class="value">{{ fmt(summary.partial) }}</div>
    </div>
    <div class="summary-card not-deductible">
      <div class="label">Not Deductible</div>
      <div class="value">{{ fmt(summary.notDeductible) }}</div>
    </div>
  </div>
</template>
