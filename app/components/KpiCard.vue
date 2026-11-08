<script setup lang="ts">
/** Kennzahl mit Veränderung zum Vorzeitraum. */
defineProps<{
  label: string
  value: string
  change?: { text: string, up: boolean } | null
}>()
</script>

<template>
  <div class="rounded-xl border border-line bg-surface p-5">
    <p class="text-xs uppercase tracking-wider text-fg-subtle">{{ label }}</p>
    <p class="mt-2 text-2xl font-medium tabular-nums">{{ value }}</p>
    <p v-if="change" class="mt-1 text-xs" :class="change.up ? 'text-success' : 'text-danger'">{{ change.text }}</p>
  </div>
</template>
