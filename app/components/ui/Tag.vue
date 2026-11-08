<script setup lang="ts">
/**
 * Kleines Etikett mit Farbton aus dem Color-Set.
 * Allgemeine Töne (neutral, accent, success …) und Ampel-Töne für Kartenzustände (mint … poor).
 */
export type TagTone =
  | 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'foil'
  | 'mint' | 'near_mint' | 'excellent' | 'good' | 'light_played' | 'played' | 'poor'

withDefaults(defineProps<{
  tone?: TagTone
  /** Großbuchstaben mit Laufweite, z.B. für Kürzel */
  caps?: boolean
  title?: string
}>(), { tone: 'neutral', caps: false })

// Vollständige Klassen, damit Tailwind sie findet
const TONES: Record<TagTone, string> = {
  neutral: 'border-line-strong text-fg-muted',
  accent: 'border-accent/40 bg-accent-soft text-accent',
  success: 'border-success/30 bg-success-soft text-success',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  danger: 'border-danger/30 bg-danger-soft text-danger',
  info: 'border-info/30 bg-info-soft text-info',
  foil: 'border-transparent bg-gradient-to-r from-foil-from to-foil-to text-fg',
  mint: 'border-cond-mint/40 bg-cond-mint/15 text-cond-mint',
  near_mint: 'border-cond-near-mint/40 bg-cond-near-mint/15 text-cond-near-mint',
  excellent: 'border-cond-excellent/40 bg-cond-excellent/15 text-cond-excellent',
  good: 'border-cond-good/40 bg-cond-good/15 text-cond-good',
  light_played: 'border-cond-light-played/40 bg-cond-light-played/15 text-cond-light-played',
  played: 'border-cond-played/40 bg-cond-played/15 text-cond-played',
  poor: 'border-cond-poor/40 bg-cond-poor/15 text-cond-poor',
}
</script>

<template>
  <span
    class="inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-medium leading-none"
    :class="[TONES[tone], { 'uppercase tracking-wider': caps }]"
    :title="title"
  >
    <slot />
  </span>
</template>
