<script setup>
defineProps({
  expenses: { type: Array, required: true }
});

defineEmits(['delete', 'export']);

function badgeClass(deductible) {
  if (deductible === 'Likely deductible') return 'badge badge-green';
  if (deductible === 'Partially deductible') return 'badge badge-yellow';
  return 'badge badge-red';
}

function fmt(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="table-section">
    <div class="table-header">
      <h2>Expenses</h2>
      <button
        v-if="expenses.length > 0"
        class="btn-export"
        @click="$emit('export')"
      >
        Export for Accountant
      </button>
    </div>

    <div v-if="expenses.length === 0" class="empty-state">
      <div class="icon">📋</div>
      <p>No expenses yet. Add one above to get started.</p>
    </div>

    <table v-else>
      <thead>
        <tr>
          <th>Name</th>
          <th>Amount</th>
          <th>Category</th>
          <th>Deductible</th>
          <th>Note</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="exp in expenses" :key="exp.id">
          <td><strong>{{ exp.name }}</strong></td>
          <td>{{ fmt(exp.amount) }}</td>
          <td><span class="badge badge-category">{{ exp.category }}</span></td>
          <td><span :class="badgeClass(exp.deductible)">{{ exp.deductible }}</span></td>
          <td>{{ exp.note }}</td>
          <td>
            <button class="btn-delete" title="Delete" @click="$emit('delete', exp.id)">&times;</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
