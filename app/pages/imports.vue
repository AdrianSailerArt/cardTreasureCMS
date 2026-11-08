<script setup lang="ts">
interface ImportsData {
  games: { code: string, name: string, sets: number, setsWithCards: number, cards: number, products: number, withPrice: number, withGerman: number, lastSuccess: string | null }[]
  runs: { id: string, game: string, status: string, args: string | null, trigger: string, stats: Record<string, number>, error: string | null, startedAt: string, finishedAt: string | null }[]
}

const { data, refresh } = await useFetch<ImportsData>('/api/imports')
const openError = ref<string | null>(null)

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %` : '–')
const duration = (r: ImportsData['runs'][number]) => {
  if (!r.finishedAt) return '…'
  const s = Math.round((new Date(r.finishedAt).getTime() - new Date(r.startedAt).getTime()) / 1000)
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`
}
</script>

<template>
  <div v-if="data">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-4xl">Imports</h1>
        <p class="mt-1 text-sm text-ink-500">Katalogstand je Spiel und die letzten Läufe. Nachts startet GitHub Actions den vollen Import.</p>
      </div>
      <button class="btn-ghost" @click="() => refresh()">Aktualisieren</button>
    </div>

    <div class="mt-8 grid gap-4 lg:grid-cols-3">
      <section v-for="g in data.games" :key="g.code" class="panel">
        <div class="flex items-baseline justify-between">
          <h2 class="text-2xl">{{ GAME_LABEL[g.code] }}</h2>
          <span class="text-xs text-ink-400">{{ g.lastSuccess ? `zuletzt ${dateTime(g.lastSuccess)}` : 'noch kein Lauf protokolliert' }}</span>
        </div>
        <dl class="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt class="text-ink-500">Karten</dt><dd class="text-right tabular-nums">{{ num(g.cards) }}</dd>
          <dt class="text-ink-500">Drucke</dt><dd class="text-right tabular-nums">{{ num(g.products) }}</dd>
          <dt class="text-ink-500">Sets mit Karten</dt><dd class="text-right tabular-nums">{{ num(g.setsWithCards) }} / {{ num(g.sets) }}</dd>
          <dt class="text-ink-500">mit Richtpreis</dt><dd class="text-right tabular-nums">{{ pct(g.withPrice, g.products) }}</dd>
          <dt class="text-ink-500">mit deutschem Namen</dt><dd class="text-right tabular-nums">{{ pct(g.withGerman, g.cards) }}</dd>
        </dl>
      </section>
    </div>

    <section class="panel mt-6">
      <h2 class="text-xl">Manuell starten</h2>
      <p class="mt-1 text-sm text-ink-500">Imports laufen als Skript, nicht auf Vercel. Im Admin-Repo:</p>
      <pre class="mt-3 overflow-x-auto rounded-lg bg-ink-100 p-3 text-xs dark:bg-ink-950">bun run import                      # alle Spiele, voll
bun run import mtg --sets=fdn,blb   # nur bestimmte Sets
bun run simulate --reset            # Demo-Marktplatz neu erzeugen</pre>
    </section>

    <section class="panel mt-6 overflow-x-auto">
      <h2 class="text-xl">Letzte Läufe</h2>
      <table class="mt-4 w-full min-w-[640px] text-sm">
        <thead class="text-left text-xs uppercase tracking-wider text-ink-400">
          <tr><th class="py-2 font-normal">Start</th><th class="font-normal">Spiel</th><th class="font-normal">Status</th><th class="font-normal">Argumente</th><th class="font-normal">Auslöser</th><th class="text-right font-normal">Dauer</th></tr>
        </thead>
        <tbody>
          <template v-for="r in data.runs" :key="r.id">
            <tr class="border-t border-ink-100 dark:border-ink-800">
              <td class="py-2 tabular-nums">{{ dateTime(r.startedAt) }}</td>
              <td>{{ GAME_LABEL[r.game] }}</td>
              <td>
                <button v-if="r.error" class="underline decoration-dotted" @click="openError = openError === r.id ? null : r.id">
                  <StatusBadge :status="r.status" />
                </button>
                <StatusBadge v-else :status="r.status" />
              </td>
              <td class="font-mono text-xs text-ink-500">{{ r.args ?? 'voll' }}</td>
              <td class="text-ink-500">{{ r.trigger === 'schedule' ? 'nachts' : 'manuell' }}</td>
              <td class="text-right tabular-nums">{{ duration(r) }}</td>
            </tr>
            <tr v-if="openError === r.id">
              <td colspan="6"><pre class="mb-2 max-h-60 overflow-auto rounded-lg bg-red-50 p-3 text-xs text-red-800 dark:bg-red-950 dark:text-red-200">{{ r.error }}</pre></td>
            </tr>
          </template>
          <tr v-if="!data.runs.length"><td colspan="6" class="py-4 text-ink-500">Noch keine Läufe protokolliert.</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
