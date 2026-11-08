<script setup lang="ts">
import type { EChartsOption } from 'echarts'

/** Umsatz (Balken) und Bestellungen (Linie) pro Tag. */
const props = defineProps<{ daily: { day: string, gmv: number, orders: number }[] }>()
const theme = useChartTheme()

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })

const option = computed<EChartsOption>(() => {
  const c = theme.value
  if (!c) return {}
  const axisLabel = { color: c.subtle, fontSize: 11 }
  return {
    textStyle: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' },
    grid: { left: 4, right: 4, top: 28, bottom: 4, containLabel: true },
    legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { color: c.muted } },
    tooltip: {
      trigger: 'axis',
      backgroundColor: c.surface,
      borderColor: c.line,
      textStyle: { color: c.fg },
      axisPointer: { type: 'shadow', shadowStyle: { color: c.line, opacity: 0.4 } },
    },
    xAxis: {
      type: 'category',
      data: props.daily.map(d => shortDate(d.day)),
      axisLine: { lineStyle: { color: c.line } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: [
      {
        type: 'value',
        splitLine: { lineStyle: { color: c.line } },
        axisLabel: { ...axisLabel, formatter: (v: number) => euro(v, 0) },
      },
      { type: 'value', splitLine: { show: false }, axisLabel, minInterval: 1 },
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
  <ChartsChartFrame :option="option" label="Umsatz und Bestellungen pro Tag" :height="240" />
</template>
