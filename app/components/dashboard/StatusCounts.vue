<script setup lang="ts">
/** Anzahl Sendungen je Status. */
defineProps<{ items: { status: string, count: number }[] }>()
</script>

<template>
  <ul class="space-y-2 text-sm">
    <li v-for="s in items" :key="s.status" class="flex items-center justify-between">
      <StatusBadge :status="s.status" />
      <span class="tabular-nums">{{ num(s.count) }}</span>
    </li>
  </ul>
</template>
