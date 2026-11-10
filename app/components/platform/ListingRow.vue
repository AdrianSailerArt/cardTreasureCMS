<script setup lang="ts">
import type { PlatformListing } from '~/types/admin'

/** Eine Zeile der eigenen Angebote: Menge, Preis und Lagerplatz direkt änderbar, pausieren. */
const props = defineProps<{ listing: PlatformListing }>()
const emit = defineEmits<{ changed: [] }>()
const quantity = ref(props.listing.quantity)
const price = ref((props.listing.priceCents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 }))
const storage = ref(props.listing.storageLocation ?? '')
const priceCents = computed(() => Math.round(Number(price.value.replace(/\./g, '').replace(',', '.')) * 100))
const dirty = computed(() => quantity.value !== props.listing.quantity || priceCents.value !== props.listing.priceCents || storage.value !== (props.listing.storageLocation ?? ''))
const busy = ref(false)
const error = ref<string | null>(null)
const put = async (body: Record<string, unknown>) => {
  busy.value = true
  error.value = null
  try {
    await $fetch(`/api/shop/listings/${props.listing.id}`, { method: 'PUT', body })
    emit('changed')
  }
  catch (e) {
    error.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage ?? 'Speichern fehlgeschlagen'
  }
  finally {
    busy.value = false
  }
}
const save = () => put({ quantity: quantity.value, priceCents: priceCents.value, storageLocation: storage.value || null })
</script>

<template>
  <tr :class="{ 'opacity-60': listing.status !== 'active' }">
    <td>
      <span class="block">{{ listing.name }}</span>
      <span class="text-meta text-fg-subtle">{{ GAME_LABEL[listing.game] }} · <template v-if="listing.kind === 'sealed'">Sealed</template><template v-else>{{ listing.setCode?.toUpperCase() }} #{{ listing.collectorNumber }}</template></span>
    </td>
    <td>
      <span class="flex flex-wrap gap-1">
        <ConditionBadge v-if="listing.condition" :condition="listing.condition" />
        <Tag v-else tone="info">Sealed</Tag>
        <Tag caps>{{ listing.language }}</Tag>
        <Tag v-if="listing.finish !== 'normal'" tone="foil">{{ listing.finish }}</Tag>
      </span>
    </td>
    <td><input v-model.number="quantity" type="number" min="1" max="999" :aria-label="`Menge ${listing.name}`" class="min-h-8 w-16 rounded-md border border-line-strong bg-bg px-2 text-right text-small tabular-nums focus:border-accent"></td>
    <td><UiInput v-model="price" class="!w-24 text-right" :aria-label="`Preis ${listing.name}`" /></td>
    <td><UiInput v-model="storage" class="!w-40" placeholder="Lagerplatz" :aria-label="`Lagerplatz ${listing.name}`" /></td>
    <td class="text-right tabular-nums text-fg-muted">{{ listing.sold }}</td>
    <td><StatusTag :status="listing.status" /></td>
    <td class="text-right">
      <span class="inline-flex flex-wrap justify-end gap-2">
        <UiButton v-if="dirty" size="sm" :disabled="busy || !(priceCents >= 10)" @click="save">Speichern</UiButton>
        <UiButton v-if="listing.status !== 'sold_out'" size="sm" variant="ghost" :disabled="busy" @click="put({ status: listing.status === 'paused' ? 'active' : 'paused' })">{{ listing.status === 'paused' ? 'Aktivieren' : 'Pausieren' }}</UiButton>
      </span>
      <UiNotice v-if="error" tone="danger" class="mt-1">{{ error }}</UiNotice>
    </td>
  </tr>
</template>
