/* KOPIE aus dem Shop (cardtresure/app/composables/useDebounced.ts); Änderungen dort machen und übernehmen. */
/**
 * Entprellter Wert: folgt `source` erst, wenn sich dieser `ms` lang nicht geändert hat (Suchfelder, Filter).
 * Optional `onChange` für Seiteneffekte (z.B. Adresse aktualisieren).
 */
export const useDebounced = <T>(source: Ref<T> | (() => T), ms = 300, onChange?: (value: T) => void) => {
  const read = () => (typeof source === 'function' ? (source as () => T)() : source.value)
  const value = ref(read()) as Ref<T>
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(source, () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      value.value = read()
      onChange?.(value.value)
    }, ms)
  }, { deep: true })
  onScopeDispose(() => clearTimeout(timer))
  return value
}
