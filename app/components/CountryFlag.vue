<script setup lang="ts">
/** Flagge eines Landes (ISO 3166-1 alpha-2), Ländername als Tooltip oder daneben. */
const props = withDefaults(defineProps<{
  code: string
  withName?: boolean
  size?: 'sm' | 'md'
}>(), { withName: false, size: 'sm' })

const name = computed(() => countryName(props.code))
</script>

<template>
  <span class="inline-flex items-center gap-1.5 align-middle" :title="name">
    <span
      class="fi shrink-0 rounded-[2px] shadow-[0_0_0_1px_var(--color-line)]"
      :class="[`fi-${code.toLowerCase()}`, size === 'sm' ? 'text-[0.85em]' : 'text-[1.1em]']"
      role="img"
      :aria-label="name"
    />
    <span v-if="withName">{{ name }}</span>
  </span>
</template>
