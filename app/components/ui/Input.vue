<script setup lang="ts">
/** Einzeiliges Eingabefeld (oder mehrzeilig mit `rows`), Stil aus dem Color-Set. */
withDefaults(defineProps<{
  type?: string
  placeholder?: string
  rows?: number
  mono?: boolean
}>(), { type: 'text', mono: false })

const model = defineModel<string>({ default: '' })
const classes = 'w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-subtle focus:border-accent'
</script>

<template>
  <textarea v-if="rows" v-model="model" :rows="rows" :placeholder="placeholder" :class="[classes, { 'font-mono': mono }]" />
  <input v-else v-model="model" :type="type" :placeholder="placeholder" :class="[classes, { 'font-mono': mono }]">
</template>
