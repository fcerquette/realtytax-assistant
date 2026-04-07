<script setup>
import { ref, computed, onMounted } from 'vue';
import ExpenseInput from './components/ExpenseInput.vue';
import ExpenseTable from './components/ExpenseTable.vue';
import ExpenseSummary from './components/ExpenseSummary.vue';
import ExportModal from './components/ExportModal.vue';

const expenses = ref([]);
const loading = ref(false);
const error = ref('');
const showExport = ref(false);

const API = '/api';

async function fetchExpenses() {
  try {
    const res = await fetch(`${API}/expenses`);
    if (!res.ok) throw new Error('Failed to load expenses');
    expenses.value = await res.json();
  } catch (e) {
    error.value = e.message;
  }
}

async function addExpense(text) {
  loading.value = true;
  error.value = '';

  try {
    // Step 1: Analyze with AI
    const analyzeRes = await fetch(`${API}/analyze-expense`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!analyzeRes.ok) throw new Error('AI analysis failed');
    const analyzed = await analyzeRes.json();

    // Step 2: Save to database
    const saveRes = await fetch(`${API}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_text: text,
        name: analyzed.name,
        amount: analyzed.amount,
        category: analyzed.category,
        deductible: analyzed.deductible,
        note: analyzed.explanation
      })
    });

    if (!saveRes.ok) throw new Error('Failed to save expense');
    const saved = await saveRes.json();

    expenses.value.unshift(saved);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function deleteExpense(id) {
  try {
    const res = await fetch(`${API}/expenses/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete');
    expenses.value = expenses.value.filter(e => e.id !== id);
  } catch (e) {
    error.value = e.message;
  }
}

const summary = computed(() => {
  const total = expenses.value.reduce((s, e) => s + Number(e.amount), 0);
  const deductible = expenses.value
    .filter(e => e.deductible === 'Likely deductible')
    .reduce((s, e) => s + Number(e.amount), 0);
  const partial = expenses.value
    .filter(e => e.deductible === 'Partially deductible')
    .reduce((s, e) => s + Number(e.amount), 0);
  const notDeductible = expenses.value
    .filter(e => e.deductible === 'Likely not deductible')
    .reduce((s, e) => s + Number(e.amount), 0);

  return { total, deductible, partial, notDeductible };
});

onMounted(fetchExpenses);
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>Realty<span>Tax</span> Assistant</h1>
      <p>Organize your expenses for tax season</p>
    </header>

    <ExpenseInput :loading="loading" @submit="addExpense" />

    <div v-if="error" class="error-msg">
      {{ error }}
      <button @click="error = ''" style="float:right;background:none;border:none;cursor:pointer;font-weight:bold;">&times;</button>
    </div>

    <ExpenseSummary :summary="summary" />

    <ExpenseTable
      :expenses="expenses"
      @delete="deleteExpense"
      @export="showExport = true"
    />

    <ExportModal
      v-if="showExport"
      :expenses="expenses"
      :summary="summary"
      @close="showExport = false"
    />

    <p class="disclaimer">
      This is not tax advice. Please consult a CPA.
    </p>
  </div>
</template>
