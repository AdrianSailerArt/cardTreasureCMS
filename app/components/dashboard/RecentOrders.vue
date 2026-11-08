<script setup lang="ts">
import type { RecentOrder } from '~/types/admin'

/** Letzte Bestellungen mit Käufer (Land), Status der Sendungen und Summe. */
defineProps<{ orders: RecentOrder[] }>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[480px] text-sm">
      <tbody>
        <tr v-for="o in orders" :key="o.number" class="border-b border-line last:border-0">
          <td class="py-2">
            <span class="font-mono text-xs">{{ o.number }}</span>
            <span class="flex items-center gap-1.5 text-xs text-fg-subtle">
              <CountryFlag v-if="o.buyerCountry" :code="o.buyerCountry" />
              {{ o.buyer }} · {{ dateTime(o.createdAt) }}
            </span>
          </td>
          <td class="py-2">
            <div class="flex flex-wrap gap-1">
              <StatusBadge v-for="(s, i) in o.shipments" :key="i" :status="s" />
            </div>
          </td>
          <td class="py-2 text-right tabular-nums">{{ euro(o.total) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
