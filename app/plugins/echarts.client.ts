import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'

/** Registriert nur die ECharts-Teile, die das CMS nutzt (hält das Bundle klein). */
export default defineNuxtPlugin(() => {
  use([CanvasRenderer, BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent])
})
