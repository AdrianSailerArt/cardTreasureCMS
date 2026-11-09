<script setup lang="ts">
import type { TopProduct } from '~/types/admin'

/** Meistverkaufte Produkte im Zeitraum, mit Link in den Shop. */
defineProps<{ products: TopProduct[] }>()
const shop = useRuntimeConfig().public.shopUrl
</script>

<template>
  <UiTable>
      <tr v-for="p in products" :key="`${p.game}-${p.slug}-${p.name}`">
        <td>
          <a v-if="p.slug" :href="`${shop}/${p.game}/cards/${p.slug}`" target="_blank" class="hover:text-accent">{{ p.name }}</a>
          <span v-else>{{ p.name }}</span>
          <span class="ml-1 text-xs text-fg-subtle">{{ GAME_LABEL[p.game] }}</span>
        </td>
        <td class="text-right tabular-nums text-fg-muted">{{ p.items }}×</td>
        <td class="text-right tabular-nums">{{ euro(p.gmv, 0) }}</td>
      </tr>
    </UiTable>
</template>
