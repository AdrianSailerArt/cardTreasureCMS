<script setup lang="ts">
/** Liste "Bezeichnung … Wert", z.B. für Bestand oder Katalogstand. */
defineProps<{ items: { label: string, value: string }[] }>()
</script>

<template>
  <dl class="space-y-2 text-sm">
    <div v-for="item in items" :key="item.label" class="flex justify-between gap-4">
      <dt class="text-fg-muted">{{ item.label }}</dt>
      <dd class="text-right tabular-nums">{{ item.value }}</dd>
    </div>
  </dl>
</template>
