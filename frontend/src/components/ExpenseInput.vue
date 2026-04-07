<script setup>
import { ref } from 'vue';

const props = defineProps({ loading: Boolean });
const emit = defineEmits(['submit']);

const text = ref('');

function handleSubmit() {
  if (!text.value.trim() || props.loading) return;
  emit('submit', text.value.trim());
  text.value = '';
}
</script>

<template>
  <div class="input-section">
    <form class="input-row" @submit.prevent="handleSubmit">
      <input
        v-model="text"
        type="text"
        placeholder='e.g. "dinner with client 80" or "facebook ads 120"'
        :disabled="loading"
      />
      <button class="btn-primary" type="submit" :disabled="loading || !text.trim()">
        {{ loading ? 'Analyzing...' : 'Add Expense' }}
      </button>
    </form>
    <p class="hint">Type an expense with the amount. AI will categorize it automatically.</p>
    <div v-if="loading" class="loading-bar">
      <span class="spinner"></span> Analyzing with AI...
    </div>
  </div>
</template>
