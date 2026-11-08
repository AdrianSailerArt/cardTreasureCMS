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
