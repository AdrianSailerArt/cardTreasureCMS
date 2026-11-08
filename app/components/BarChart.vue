<script setup lang="ts">
/** Schlichtes Balkendiagramm (SVG) für Tageswerte. */
const props = defineProps<{
  data: { label: string, value: number }[]
  format: (v: number) => string
}>()

const max = computed(() => Math.max(1, ...props.data.map(d => d.value)))
const hover = ref<number | null>(null)
const W = 600
const H = 160
const gap = 2
const barW = computed(() => Math.max(1, W / Math.max(1, props.data.length) - gap))
</script>

<template>
  <div class="relative">
    <svg :viewBox="`0 0 ${W} ${H}`" class="h-40 w-full" preserveAspectRatio="none" role="img" aria-label="Umsatz pro Tag">
      <line :x1="0" :x2="W" :y1="H - 0.5" :y2="H - 0.5" class="stroke-ink-200 dark:stroke-ink-800" />
      <rect
        v-for="(d, i) in data"
        :key="d.label"
        :x="i * (barW + gap)"
        :y="H - (d.value / max) * (H - 8)"
        :width="barW"
        :height="(d.value / max) * (H - 8)"
        rx="1.5"
        :class="hover === i ? 'fill-gold-600' : 'fill-gold-400'"
        @mouseenter="hover = i"
        @mouseleave="hover = null"
      />
    </svg>
    <div class="mt-1 flex justify-between text-[11px] text-ink-400">
      <span>{{ data[0]?.label }}</span>
      <span v-if="hover !== null" class="text-ink-700 dark:text-ink-200">{{ data[hover]?.label }}: {{ format(data[hover]!.value) }}</span>
      <span>{{ data.at(-1)?.label }}</span>
    </div>
  </div>
</template>
