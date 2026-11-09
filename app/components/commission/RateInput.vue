<script setup lang="ts">
/** Provisionssatz in Prozent eingeben (bis zwei Nachkommastellen), Modell in Basispunkten (450 = 4,5 %). */
const model = defineModel<number | null>({ required: true })
const text = ref(model.value === null ? '' : (model.value / 100).toLocaleString('de-DE'))
watch(model, (v) => {
  const parsed = Math.round(Number(text.value.replace(',', '.')) * 100)
  if (v !== parsed) text.value = v === null ? '' : (v / 100).toLocaleString('de-DE')
})
const onInput = () => {
  const n = Number(text.value.replace(',', '.'))
  model.value = text.value.trim() === '' || Number.isNaN(n) ? null : Math.round(n * 100)
}
const invalid = computed(() => model.value !== null && (model.value < 0 || model.value > 2000))
</script>

<template>
  <div class="flex min-h-10 items-center rounded-md border bg-bg focus-within:border-accent focus-within:outline-2 focus-within:outline-accent" :class="invalid ? 'border-danger' : 'border-line-strong'">
    <input v-model="text" inputmode="decimal" class="w-full bg-transparent px-3 py-2 text-right text-small tabular-nums text-fg focus-visible:outline-none" :aria-invalid="invalid ? 'true' : undefined" @input="onInput">
    <span class="pr-3 text-small text-fg-subtle">%</span>
  </div>
</template>
