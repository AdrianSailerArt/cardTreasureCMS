export interface ChartTheme {
  fg: string
  muted: string
  subtle: string
  line: string
  surface: string
  accent: string
  accentStrong: string
  success: string
  danger: string
  info: string
  warning: string
}

/** Liest die Color-Set-Tokens (CSS-Variablen) für ECharts und folgt dem Wechsel hell/dunkel. */
export const useChartTheme = () => {
  const read = (): ChartTheme => {
    const css = getComputedStyle(document.documentElement)
    const v = (name: string) => css.getPropertyValue(`--color-${name}`).trim()
    return {
      fg: v('fg'), muted: v('fg-muted'), subtle: v('fg-subtle'), line: v('line'), surface: v('surface'),
      accent: v('accent'), accentStrong: v('accent-strong'),
      success: v('success'), danger: v('danger'), info: v('info'), warning: v('warning'),
    }
  }

  const theme = shallowRef<ChartTheme | null>(null)
  if (import.meta.client) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => {
      theme.value = read()
    }
    onMounted(() => {
      update()
      mq.addEventListener('change', update)
    })
    onBeforeUnmount(() => mq.removeEventListener('change', update))
  }
  return theme
}

/* chartBase: KOPIE aus dem Shop (cardtresure/app/composables/useChartTheme.ts) */
/**
 * Gemeinsame Grundeinstellungen aller Diagramme (Schrift, Raster, Legende, Tooltip, Achsen) in den Farben des Color-Sets.
 * Diagramme ergänzen nur noch Daten und Serien.
 */
export const chartBase = (c: ChartTheme, formatValue: (v: number) => string) => {
  const axisLabel = { color: c.subtle, fontSize: 11 }
  return {
    textStyle: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    grid: { left: 4, right: 4, top: 28, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: c.muted } },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: c.surface,
      borderColor: c.line,
      textStyle: { color: c.fg },
      valueFormatter: (v: unknown) => (v === null || v === undefined || v === '-' ? '–' : formatValue(Number(v))),
    },
    categoryAxis: { type: 'category' as const, axisLine: { lineStyle: { color: c.line } }, axisTick: { show: false }, axisLabel },
    valueAxis: { type: 'value' as const, splitLine: { lineStyle: { color: c.line } }, axisLabel: { ...axisLabel, formatter: (v: number) => formatValue(v) } },
    axisLabel,
  }
}
