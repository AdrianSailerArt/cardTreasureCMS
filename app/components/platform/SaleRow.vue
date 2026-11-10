<script setup lang="ts">
import type { PlatformSale } from '~/types/admin'

/** Ein Verkauf von CardTreasure: Lieferadresse, Packliste mit Lagerplatz, Versenden (mit Sendungsnummer) oder Stornieren. */
const props = defineProps<{ sale: PlatformSale }>()
const emit = defineEmits<{ changed: [] }>()
const tracking = ref('')
const confirmCancel = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)
const act = async (action: 'ship' | 'cancel') => {
  busy.value = true
  error.value = null
  try {
    await $fetch(`/api/shop/sales/${props.sale.id}/${action}`, { method: 'POST', body: action === 'ship' ? { trackingNumber: tracking.value || null } : {} })
    emit('changed')
  }
  catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Fehlgeschlagen'
  }
  finally {
    busy.value = false
  }
}
const a = computed(() => props.sale.address)
</script>

<template>
  <Panel as="article" padding="sm">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="flex flex-wrap items-center gap-2"><span class="font-mono text-small">{{ sale.orderNumber }}</span><StatusTag :status="sale.status" /></p>
        <p class="mt-1 text-meta text-fg-subtle">{{ dateTime(sale.paidAt) }} · {{ euro(sale.itemsCents + sale.shippingCents) }} · {{ sale.shippingService ?? 'Versand' }}</p>
      </div>
      <address class="text-small not-italic leading-snug">
        {{ a.name }}<br>{{ a.street }} {{ a.houseNumber }}<template v-if="a.extra"><br>{{ a.extra }}</template><br>
        <span class="inline-flex items-center gap-1.5"><CountryFlag :code="a.country" />{{ a.postalCode }} {{ a.city }}</span>
      </address>
    </div>
    <ul class="mt-3 divide-y divide-line rounded-md bg-surface-muted px-3 text-small">
      <li v-for="(i, n) in sale.items" :key="n" class="flex flex-wrap justify-between gap-2 py-2">
        <span>{{ i.quantity }}× {{ i.name }} <span class="text-meta text-fg-subtle">{{ i.condition ? CONDITION_SHORT[i.condition] : 'Sealed' }} · {{ i.language.toUpperCase() }}</span></span>
        <span class="text-label" :class="i.storageLocation ? 'text-fg' : 'text-fg-subtle'">{{ i.storageLocation ?? 'ohne Lagerplatz' }}</span>
      </li>
    </ul>
    <div v-if="sale.status === 'paid'" class="mt-3 flex flex-wrap items-center gap-2">
      <UiInput v-model="tracking" class="!w-56" placeholder="Sendungsnummer (optional)" aria-label="Sendungsnummer" />
      <UiButton size="sm" :disabled="busy" @click="act('ship')">Als versendet markieren</UiButton>
      <UiButton v-if="!confirmCancel" size="sm" variant="ghost" @click="confirmCancel = true">Stornieren</UiButton>
      <template v-else>
        <span class="text-small text-fg-muted">Wirklich stornieren? Die einbehaltene Kartengebühr tragen wir.</span>
        <UiButton size="sm" variant="danger" :disabled="busy" @click="act('cancel')">Ja, stornieren</UiButton>
        <UiButton size="sm" variant="ghost" @click="confirmCancel = false">Nein</UiButton>
      </template>
    </div>
    <p v-else-if="sale.trackingNumber" class="mt-2 text-meta text-fg-subtle">Sendungsnummer {{ sale.trackingNumber }}</p>
    <UiNotice v-if="error" tone="danger" class="mt-2">{{ error }}</UiNotice>
  </Panel>
</template>
