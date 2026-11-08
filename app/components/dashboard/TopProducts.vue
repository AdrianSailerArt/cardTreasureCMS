<script setup lang="ts">
import type { TopProduct } from '~/types/admin'

/** Meistverkaufte Produkte im Zeitraum, mit Link in den Shop. */
defineProps<{ products: TopProduct[] }>()
const shop = useRuntimeConfig().public.shopUrl
</script>

<template>
  <table class="w-full text-sm">
    <tbody>
      <tr v-for="p in products" :key="`${p.game}-${p.slug}-${p.name}`" class="border-b border-line last:border-0">
        <td class="py-2">
          <a v-if="p.slug" :href="`${shop}/${p.game}/cards/${p.slug}`" target="_blank" class="hover:text-accent">{{ p.name }}</a>
          <span v-else>{{ p.name }}</span>
          <span class="ml-1 text-xs text-fg-subtle">{{ GAME_LABEL[p.game] }}</span>
        </td>
        <td class="py-2 text-right tabular-nums text-fg-muted">{{ p.items }}×</td>
        <td class="py-2 text-right tabular-nums">{{ euro(p.gmv, 0) }}</td>
      </tr>
    </tbody>
  </table>
</template>
