<script setup lang="ts">
import type { CommissionOverride } from '~/types/admin'

/** Individuelle Konditionen mit Status (läuft grün, abgelaufen/beendet neutral) und „Beenden“. */
defineProps<{ overrides: CommissionOverride[], showCustomer?: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const busy = ref<string | null>(null)
const end = async (id: string) => {
  busy.value = id
  try {
    await $fetch(`/api/commission/overrides/${id}/end`, { method: 'POST', body: { reason: null } })
    emit('changed')
  }
  finally {
    busy.value = null
  }
}
const percent = (bps: number) => `${(bps / 100).toLocaleString('de-DE')} %`
</script>

<template>
  <UiTable :min-width="680">
    <template #head>
      <th v-if="showCustomer">Kunde</th><th class="text-right">Satz</th><th>Grund</th><th>gültig</th><th>Status</th><th />
    </template>
    <tr v-for="o in overrides" :key="o.id">
      <td v-if="showCustomer"><NuxtLink :to="`/customers/${o.sellerId}`" class="hover:text-accent">{{ o.customer }}</NuxtLink></td>
      <td class="text-right tabular-nums">{{ percent(o.rateBps) }}</td>
      <td class="text-fg-muted">{{ o.reason }}<span v-if="o.grantedBy" class="block text-xs text-fg-subtle">von {{ o.grantedBy }}</span></td>
      <td class="tabular-nums text-fg-muted">{{ dateTime(o.validFrom).slice(0, 8) }} – {{ o.endedAt ? dateTime(o.endedAt).slice(0, 8) : o.validUntil ? dateTime(o.validUntil).slice(0, 8) : 'offen' }}</td>
      <td><Tag :tone="o.active ? 'success' : 'neutral'">{{ o.active ? 'läuft' : o.endedAt ? 'beendet' : 'abgelaufen' }}</Tag></td>
      <td class="text-right"><UiButton v-if="o.active" variant="ghost" :disabled="busy === o.id" @click="end(o.id)">Beenden</UiButton></td>
    </tr>
    <tr v-if="!overrides.length"><td :colspan="showCustomer ? 6 : 5" class="py-4 text-fg-muted">Keine individuellen Konditionen.</td></tr>
  </UiTable>
</template>
