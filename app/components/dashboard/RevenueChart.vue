<script setup lang="ts">
import type { EChartsOption } from 'echarts'

/** Umsatz (Balken) und Bestellungen (Linie) pro Tag. */
const props = defineProps<{ daily: { day: string, gmv: number, orders: number }[] }>()
const theme = useChartTheme()

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

const option = computed<EChartsOption>(() => {
  const c = theme.value
  if (!c) return {}
  const base = chartBase(c, v => euro(v, 0))
  return {
    textStyle: base.textStyle,
    grid: base.grid,
    legend: base.legend,
    tooltip: { ...base.tooltip, valueFormatter: undefined, axisPointer: { type: 'shadow', shadowStyle: { color: c.line, opacity: 0.4 } } },
    xAxis: { ...base.categoryAxis, data: props.daily.map(d => shortDate(d.day)) },
    yAxis: [
      base.valueAxis,
      { type: 'value', splitLine: { show: false }, axisLabel: base.axisLabel, minInterval: 1 },
    ],
    series: [
      {
        name: 'Umsatz',
        type: 'bar',
        data: props.daily.map(d => d.gmv),
        itemStyle: { color: c.accent, borderRadius: [3, 3, 0, 0] },
        emphasis: { itemStyle: { color: c.accentStrong } },
        tooltip: { valueFormatter: v => euro(Number(v)) },
      },
      {
        name: 'Bestellungen',
        type: 'line',
        yAxisIndex: 1,
        data: props.daily.map(d => d.orders),
        // leichte Glättung; stärkere schwingt zwischen den Tagen über und täuscht Werte vor
        smooth: 0.2,
        showSymbol: false,
        lineStyle: { color: c.info, width: 2 },
        itemStyle: { color: c.info },
      },
    ],
  }
})
</script>

<template>
  <ChartFrame :option="option" label="Umsatz und Bestellungen pro Tag" :height="240" />
</template>
