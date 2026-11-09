<script setup lang="ts">
import type { SealedRow } from '~~/server/lib/sealed'

/** Sealed-Katalog: nur Admins legen Produkte an; Verkäufer bieten sie im Shop an. */
const game = ref<string | null>(null)
const { data: items } = await useFetch<SealedRow[]>('/api/sealed', { query: computed(() => ({ game: game.value ?? undefined })), default: () => [] })
const shopUrl = useRuntimeConfig().public.shopUrl
const gameOptions = [{ value: null, label: 'Alle Spiele' }, ...Object.entries(GAME_LABEL).map(([value, label]) => ({ value, label }))]

useSeoMeta({ title: 'Sealed – CardTreasure CMS' })
</script>

<template>
  <div>
    <PageHeader title="Sealed-Katalog" description="Booster, Displays, Decks und Boxen. Nur hier angelegte Produkte können im Shop verkauft werden.">
      <UiButton to="/sealed/neu">Neues Produkt</UiButton>
    </PageHeader>
    <div class="mt-6 w-56"><UiSelect v-model="game" :options="gameOptions" /></div>
    <Panel class="mt-4">
      <UiTable :min-width="720">
        <template #head>
          <th>Produkt</th><th>Typ</th><th>Sprache</th><th>Set</th><th>Erscheint</th><th class="text-right">Angebote</th><th />
        </template>
        <tr v-for="s in items" :key="s.id">
          <td>
            <span class="flex items-center gap-3">
              <img v-if="s.imageId" :src="`${shopUrl}/media/${s.imageId}?size=thumb`" alt="" class="h-10 w-10 rounded object-contain">
              <span class="grid h-10 w-10 place-items-center rounded bg-surface-muted text-micro text-fg-subtle" v-else>–</span>
              <span>{{ s.nameDe ?? s.name }} <span class="block text-meta text-fg-subtle">{{ GAME_LABEL[s.game] }}</span></span>
            </span>
          </td>
          <td><Tag>{{ SEALED_TYPE_LABEL[s.type] ?? s.type }}</Tag></td>
          <td class="uppercase">{{ s.language }}</td>
          <td class="text-fg-muted">{{ s.setName ?? '–' }}</td>
          <td class="tabular-nums text-fg-muted">{{ s.releaseDate ?? '–' }}</td>
          <td class="text-right tabular-nums">{{ s.offers }}</td>
          <td class="text-right">
            <NuxtLink :to="`/sealed/${s.id}`" class="text-accent hover:underline">Bearbeiten</NuxtLink>
            <a :href="`${shopUrl}/${s.game}/sealed/${s.slug}`" target="_blank" class="ml-3 text-fg-subtle hover:text-accent">Shop ↗</a>
          </td>
        </tr>
        <tr v-if="!items.length"><td colspan="7" class="py-6 text-fg-muted">Noch keine Sealed-Produkte.</td></tr>
      </UiTable>
    </Panel>
  </div>
</template>
