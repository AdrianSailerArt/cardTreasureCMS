<script setup lang="ts">
import type { PrintingImageRow } from '~~/server/api/printings/index.get'

/** Falsch ausgelieferte Kartenbilder aus den Katalog-APIs durch eigene ersetzen. */
const q = ref('')
const query = useDebounced(() => q.value.trim(), 300)
const { data: printings, refresh } = await useFetch<PrintingImageRow[]>('/api/printings', { query: { q: query }, default: () => [] })

useSeoMeta({ title: 'Kartenbilder – CardTreasure CMS' })
</script>

<template>
  <div>
    <PageHeader
      title="Kartenbilder"
      description="Falsches Bild aus Scryfall, TCGdex oder YGOPRODeck? Hier ersetzen. Der Ersatz bleibt bei neuen Imports erhalten und erscheint im Shop spätestens nach einer Stunde in jedem Browser."
    />
    <div class="mt-6 max-w-md">
      <UiInput v-model="q" placeholder="Kartenname (de/en) oder Set-Kürzel …" />
    </div>
    <p class="mt-3 text-small text-fg-muted">
      {{ q.trim().length >= 2 ? `${printings.length} Drucke` : printings.length ? 'Zuletzt ersetzte Bilder' : 'Noch keine Bilder ersetzt. Suche oben nach einer Karte.' }}
    </p>
    <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ImagesPrintingImageCard v-for="p in printings" :key="p.id" :printing="p" @changed="refresh" />
    </div>
  </div>
</template>
