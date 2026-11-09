/** Meldung abschließen (an den Shop weiterreichen; meldende Person bekommt Bescheid). */
export default defineEventHandler(async (event): Promise<unknown> => {
  const body = await readBody<Record<string, unknown>>(event)
  return await shopInternal<unknown>(event, `reports/${getRouterParam(event, 'id')}/handle`, { method: 'POST', body })
})
