<script setup lang="ts">
import type { GameCatalog, ImportRun } from '~/types/admin'

const { data, refresh } = await useFetch<{ games: GameCatalog[], runs: ImportRun[] }>('/api/imports')
const reload = () => refresh()
</script>

<template>
  <div v-if="data">
    <PageHeader title="Imports" description="Katalogstand je Spiel und die letzten Läufe. Nachts startet GitHub Actions den vollen Import.">
      <UiButton variant="ghost" @click="reload">Aktualisieren</UiButton>
    </PageHeader>

    <div class="mt-8 grid gap-4 lg:grid-cols-3">
      <ImportsGameCard v-for="g in data.games" :key="g.code" :game="g" />
    </div>

    <Panel title="Manuell starten" class="mt-6">
      <p class="text-small text-fg-muted">Imports laufen als Skript, nicht auf Vercel. Im Repo cardTreasureCMS:</p>
      <pre class="mt-3 overflow-x-auto rounded-lg bg-surface-muted p-3 text-meta">bun run import                      # alle Spiele, voll
bun run import mtg --sets=fdn,blb   # nur bestimmte Sets
bun run testdata --reset            # nur Katalog + feste Testkonten (sauber für Stripe-Tests)
bun run simulate --reset            # großer Demo-Marktplatz mit Verlauf</pre>
    </Panel>

    <Panel title="Letzte Läufe" class="mt-6">
      <ImportsRunsTable :runs="data.runs" />
    </Panel>
  </div>
</template>
