<script setup lang="ts">
/** Kurze Rückmeldung (Erfolg, Fehler, Hinweis) in der Farbe aus dem Color-Set. */
withDefaults(defineProps<{ tone?: 'success' | 'danger' | 'info' }>(), { tone: 'info' })
const toneClass = { success: 'text-success', danger: 'text-danger', info: 'text-info' }
</script>

<template>
  <p class="text-sm" :class="toneClass[tone]" role="status">
    <slot />
  </p>
</template>
