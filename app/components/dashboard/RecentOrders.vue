<script setup lang="ts">
import type { RecentOrder } from '~/types/admin'

/** Letzte Bestellungen mit Käufer (Land), Status der Sendungen und Summe. */
defineProps<{ orders: RecentOrder[] }>()
</script>

<template>
  <UiTable :min-width="480">
        <tr v-for="o in orders" :key="o.number">
          <td>
            <span class="font-mono text-meta">{{ o.number }}</span>
            <span class="flex items-center gap-1.5 text-meta text-fg-subtle">
              <CountryFlag v-if="o.buyerCountry" :code="o.buyerCountry" />
              {{ o.buyer }} · {{ dateTime(o.createdAt) }}
            </span>
          </td>
          <td>
            <div class="flex flex-wrap gap-1">
              <StatusTag v-for="(s, i) in o.shipments" :key="i" :status="s" />
            </div>
          </td>
          <td class="text-right tabular-nums">{{ euro(o.total) }}</td>
        </tr>
      </UiTable>
</template>
