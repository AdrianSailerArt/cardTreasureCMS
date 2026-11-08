<script setup lang="ts">
/** Status als farbiges Etikett (Farbe aus dem Color-Set, Text auf Deutsch). */
const props = defineProps<{ status: string }>()

const toneClass: Record<Tone, string> = {
  neutral: 'bg-surface-muted text-fg-muted',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
}
const tone = computed(() => toneClass[statusTone(props.status)])
</script>

<template>
  <span class="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs" :class="tone">
    {{ STATUS_LABEL[status] ?? status }}
  </span>
</template>
