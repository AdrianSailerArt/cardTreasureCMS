<script setup lang="ts">
import type { EChartsOption } from 'echarts'

/** Provision, Auszahlungen und Erstattungen pro Monat (Balken), Umsatz als Linie auf eigener Achse. */
const props = defineProps<{ monthly: { month: string, gmvCents: number, commissionCents: number, payoutsCents: number, refundsCents: number }[] }>()
const theme = useChartTheme()
const label = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })

const option = computed<EChartsOption>(() => {
  const c = theme.value
  if (!c) return {}
  const base = chartBase(c, v => euro(v, 0))
  return {
    textStyle: base.textStyle,
    grid: base.grid,
    legend: base.legend,
    tooltip: base.tooltip,
    xAxis: { ...base.categoryAxis, data: props.monthly.map(m => label(m.month)) },
    yAxis: [base.valueAxis, { ...base.valueAxis, splitLine: { show: false } }],
    series: [
      { name: 'Provision', type: 'bar', data: props.monthly.map(m => m.commissionCents), itemStyle: { color: c.success, borderRadius: [3, 3, 0, 0] } },
      { name: 'Auszahlungen', type: 'bar', data: props.monthly.map(m => m.payoutsCents), itemStyle: { color: c.info, borderRadius: [3, 3, 0, 0] } },
      { name: 'Erstattungen', type: 'bar', data: props.monthly.map(m => m.refundsCents), itemStyle: { color: c.danger, borderRadius: [3, 3, 0, 0] } },
      { name: 'Umsatz (Warenwert)', type: 'line', yAxisIndex: 1, smooth: true, data: props.monthly.map(m => m.gmvCents), lineStyle: { color: c.accent, width: 2 }, itemStyle: { color: c.accent } },
    ],
  }
})
</script>

<template>
  <ChartFrame :option="option" label="Provision, Auszahlungen, Erstattungen und Umsatz pro Monat" :height="280" />
</template>
