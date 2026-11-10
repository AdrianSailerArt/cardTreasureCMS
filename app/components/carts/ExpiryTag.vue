<script setup lang="ts">
/** Anzahl abgelaufener Warenkörbe als Ampel: einmal Grün, zweimal Gelb, ab dem Schwellenwert Rot. */
const props = defineProps<{ count: number, threshold: number }>()
const tone = computed(() => (props.count >= props.threshold ? 'danger' : props.count > 1 ? 'warning' : 'success'))
</script>

<template>
  <Tag :tone="tone">{{ count }}× {{ count >= threshold ? '· auffällig' : '' }}</Tag>
</template>
