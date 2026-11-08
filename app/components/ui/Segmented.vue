<script setup lang="ts" generic="T extends string | number">
/** Umschalter mit wenigen Optionen, z.B. Zeitraum 7/30/90 Tage. */
defineProps<{ options: { value: T, label: string }[] }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <div class="flex gap-1 rounded-full border border-line-strong p-1 text-sm">
    <button
      v-for="o in options"
      :key="String(o.value)"
      type="button"
      class="rounded-full px-4 py-1 transition"
      :class="model === o.value ? 'bg-primary text-on-primary' : 'text-fg-muted hover:text-fg'"
      @click="model = o.value"
    >
      {{ o.label }}
    </button>
  </div>
</template>
