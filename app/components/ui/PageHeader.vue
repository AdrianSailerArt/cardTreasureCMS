<script setup lang="ts">
/** Seitenkopf mit Titel, Beschreibung und Aktionen rechts. */
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <slot name="above" />
      <h1 class="text-4xl">{{ title }}</h1>
      <p v-if="description" class="mt-1 text-sm text-fg-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="flex flex-wrap items-center gap-3">
      <slot />
    </div>
  </div>
</template>
