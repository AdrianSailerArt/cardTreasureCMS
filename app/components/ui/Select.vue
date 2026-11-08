<script setup lang="ts" generic="T extends string | null">
/** Auswahlfeld mit Optionen aus `options` (Wert + Beschriftung). */
defineProps<{ options: { value: T, label: string }[] }>()
const model = defineModel<T>({ required: true })
</script>

<template>
  <select v-model="model" class="w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent">
    <option v-for="o in options" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
  </select>
</template>
