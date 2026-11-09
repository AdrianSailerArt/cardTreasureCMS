<script setup lang="ts">
import type { SellerRisk } from '~/types/admin'

/** Risikosignale eines Verkäufers als Ampel-Tags (rot = schwer, gelb = beobachten). */
defineProps<{ flags: SellerRisk['flags'], blocked?: boolean }>()
const LABEL: Record<SellerRisk['flags'][number], { text: string, tone: 'danger' | 'warning' }> = {
  warning_level: { text: 'Stufe auffällig', tone: 'danger' },
  overdue: { text: 'Versand überfällig', tone: 'warning' },
  cancels: { text: 'viele Stornos', tone: 'warning' },
  bad_reviews: { text: 'schlechte Bewertungen', tone: 'danger' },
}
</script>

<template>
  <span class="flex flex-wrap gap-1">
    <Tag v-if="blocked" tone="danger">gesperrt</Tag>
    <Tag v-for="f in flags" :key="f" :tone="LABEL[f].tone">{{ LABEL[f].text }}</Tag>
    <Tag v-if="!flags.length && !blocked" tone="success">unauffällig</Tag>
  </span>
</template>
