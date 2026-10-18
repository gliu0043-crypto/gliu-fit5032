import { computed, reactive, ref, toValue, watch } from 'vue'

export const TABLE_PAGE_SIZE = 10
const collator = new Intl.Collator('en-AU', { numeric: true, sensitivity: 'base' })
const normalise = (value) => String(value ?? '').trim().toLocaleLowerCase('en-AU')
const valueFor = (row, column) => column.value ? column.value(row) : row[column.key]

export function useDataTable(rows, columns, initialSort = {}) {
  const search = ref('')
  const filters = reactive({})
  const sortKey = ref(initialSort.key || '')
  const sortDirection = ref(initialSort.direction === 'desc' ? 'desc' : 'asc')
  const page = ref(1)
  const searchableColumns = computed(() => toValue(columns).filter((column) => column.searchable !== false))
  const hasFilters = computed(() => Boolean(normalise(search.value)) || Object.values(filters).some((value) => normalise(value)))

  const filteredRows = computed(() => {
    const term = normalise(search.value)
    return toValue(rows).filter((row) => {
      const values = searchableColumns.value.map((column) => [column.key, normalise(valueFor(row, column))])
      return (!term || values.some(([, value]) => value.includes(term)))
        && values.every(([key, value]) => value.includes(normalise(filters[key])))
    })
  })

  const sortedRows = computed(() => {
    const column = toValue(columns).find((item) => item.key === sortKey.value && item.sortable !== false)
    const result = [...filteredRows.value]
    if (!column) return result
    return result.sort((left, right) => {
      const a = column.sortValue ? column.sortValue(left) : valueFor(left, column)
      const b = column.sortValue ? column.sortValue(right) : valueFor(right, column)
      const missingA = a == null || a === '' || (typeof a === 'number' && Number.isNaN(a))
      const missingB = b == null || b === '' || (typeof b === 'number' && Number.isNaN(b))
      // Missing values stay at the end in either direction.
      if (missingA || missingB) return Number(missingA) - Number(missingB)
      const comparison = typeof a === 'number' && typeof b === 'number'
        ? a - b
        : collator.compare(String(a), String(b))
      return sortDirection.value === 'asc' ? comparison : -comparison
    })
  })

  const pageCount = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / TABLE_PAGE_SIZE)))
  const visibleRows = computed(() => sortedRows.value.slice((page.value - 1) * TABLE_PAGE_SIZE, page.value * TABLE_PAGE_SIZE))
  const firstRow = computed(() => sortedRows.value.length ? (page.value - 1) * TABLE_PAGE_SIZE + 1 : 0)
  const lastRow = computed(() => Math.min(page.value * TABLE_PAGE_SIZE, sortedRows.value.length))

  watch([search, filters, sortKey, sortDirection], () => { page.value = 1 }, { deep: true, flush: 'sync' })
  watch(pageCount, (count) => { page.value = Math.min(page.value, count) }, { flush: 'sync' })

  function sortBy(key) {
    if (!toValue(columns).some((column) => column.key === key && column.sortable !== false)) return
    if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    else { sortKey.value = key; sortDirection.value = 'asc' }
  }
  function goToPage(number) {
    page.value = Math.max(1, Math.min(pageCount.value, number))
  }
  function clearFilters() {
    search.value = ''
    Object.keys(filters).forEach((key) => { filters[key] = '' })
    page.value = 1
  }

  return { search, filters, hasFilters, sortKey, sortDirection, page, pageCount, filteredRows, sortedRows, visibleRows, firstRow, lastRow, sortBy, goToPage, clearFilters }
}
