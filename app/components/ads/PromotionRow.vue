<script setup lang="ts">
import type { Promotion } from '~/types/admin'

/** Eine laufende Werbung: Angebot, Händler mit Flagge, Satz, Klicks, Verkäufe, Werbeertrag, beenden mit Grund. */
const props = defineProps<{ promotion: Promotion }>()
const emit = defineEmits<{ changed: [] }>()
const shopUrl = useRuntimeConfig().public.shopUrl
const link = computed(() => props.promotion.cardSlug ? `${shopUrl}/${props.promotion.game}/cards/${props.promotion.cardSlug}` : null)
</script>

<template>
  <tr>
    <td>
      <a v-if="link" :href="link" target="_blank" rel="noopener" class="hover:text-accent">{{ promotion.name }}</a>
      <span v-else>{{ promotion.name }}</span>
      <span class="block text-meta text-fg-subtle">{{ GAME_LABEL[promotion.game] }} · {{ euro(promotion.priceCents) }} · seit {{ dateTime(promotion.startedAt) }}</span>
    </td>
    <td>
      <NuxtLink :to="`/customers/${promotion.sellerId}`" class="inline-flex items-center gap-1.5 hover:text-accent">
        <CountryFlag :code="promotion.sellerCountry" />{{ promotion.seller }}
      </NuxtLink>
    </td>
    <td class="text-right tabular-nums">{{ percent(promotion.rateBps) }}</td>
    <td class="text-right tabular-nums">{{ num(promotion.clicks) }}</td>
    <td class="text-right tabular-nums">{{ num(promotion.adSales) }}</td>
    <td class="text-right tabular-nums">{{ euro(promotion.adRevenueCents) }}</td>
    <td><StatusTag :status="promotion.status" /></td>
    <td class="text-right">
      <ModerationActionButton label="Beenden" action="end-promotion" :url="`/api/ads/${promotion.listingId}/end`" :payload="{}" placeholder="Grund (geht per Mail an den Händler)" @done="emit('changed')" />
    </td>
  </tr>
</template>
