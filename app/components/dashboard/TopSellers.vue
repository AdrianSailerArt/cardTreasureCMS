<script setup lang="ts">
import type { TopSeller } from '~/types/admin'

/** Verkäufer mit dem höchsten Umsatz im Zeitraum, mit Land, Art und Bewertung. */
defineProps<{ sellers: TopSeller[] }>()
</script>

<template>
  <ul class="space-y-2 text-small">
    <li v-for="s in sellers" :key="s.name" class="flex items-center justify-between gap-2">
      <span class="flex min-w-0 items-center gap-2">
        <CountryFlag :code="s.country" />
        <span class="truncate">{{ s.name }}</span>
        <span class="shrink-0 text-meta text-fg-subtle">
          {{ s.type === 'commercial' ? 'gewerblich' : 'privat' }}<template v-if="s.rating"> · ★ {{ s.rating.toFixed(1) }}</template>
        </span>
      </span>
      <span class="shrink-0 tabular-nums">{{ euro(s.gmv, 0) }}</span>
    </li>
  </ul>
</template>
