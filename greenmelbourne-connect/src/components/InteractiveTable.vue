<script setup>
import { computed, ref } from 'vue'
import { createCsv, createPdf, downloadFile, exportTable } from '../data/export'
import { TABLE_PAGE_SIZE, useDataTable } from '../composables/useDataTable'

const props = defineProps({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  rows: { type: Array, required: true },
  columns: { type: Array, required: true },
  initialSort: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  emptyMessage: { type: String, default: 'No records yet.' },
  exportable: { type: Boolean, default: false },
})
const { search, filters, hasFilters, sortKey, sortDirection, page, pageCount, filteredRows, sortedRows, visibleRows, firstRow, lastRow, sortBy, goToPage, clearFilters } = useDataTable(() => props.rows, () => props.columns, props.initialSort)
const unavailable = computed(() => props.loading || Boolean(props.error))
const exporting = ref(false), exportMessage = ref(''), exportError = ref('')
async function exportRows(format) {
  if (!props.exportable || unavailable.value || exporting.value || !sortedRows.value.length) return
  exporting.value = true; exportMessage.value = ''; exportError.value = ''
  const table = exportTable(sortedRows.value, props.columns)
  const timestamp = new Date()
  try {
    const blob = format === 'csv' ? new Blob([createCsv(table)], { type: 'text/csv;charset=utf-8' }) : await createPdf(table, props.title, timestamp)
    downloadFile(blob, `${props.id}-${timestamp.toISOString().slice(0, 10)}.${format}`)
    exportMessage.value = `${table.body.length} records exported as ${format.toUpperCase()}. Check your downloads.`
  } catch { exportError.value = 'Export could not be completed. Please retry, or use CSV.' }
  finally { exporting.value = false }
}
const sortLabel = (column) => {
  const direction = sortKey.value === column.key && sortDirection.value === 'asc' ? 'descending' : 'ascending'
  return `Sort ${props.title} by ${column.label.toLowerCase()}, ${direction}`
}
const cellValue = (row, column) => (column.value ? column.value(row) : row[column.key]) ?? '—'
</script>

<template>
  <section class="interactive-table" :aria-labelledby="`${id}-heading`" :aria-busy="loading">
    <div class="table-intro">
      <div>
        <h2 :id="`${id}-heading`">{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <span class="table-count">{{ loading ? 'Loading…' : error ? 'Unavailable' : `${rows.length} total` }}</span>
    </div>

    <div class="table-toolbar">
      <div class="table-search">
        <label :for="`${id}-search`">Search {{ title.toLowerCase() }}</label>
        <input :id="`${id}-search`" v-model="search" class="form-control" type="search"
          placeholder="Search all columns" :disabled="unavailable" :aria-controls="`${id}-table`">
      </div>
      <button class="btn btn-outline-success" type="button" :disabled="!hasFilters || unavailable" @click="clearFilters">
        Clear filters<span class="visually-hidden"> for {{ title.toLowerCase() }}</span>
      </button>
    </div>

    <div v-if="exportable" class="export-toolbar">
      <button class="btn btn-outline-success" type="button" :disabled="unavailable || exporting || !sortedRows.length" :aria-label="`Export CSV for ${title.toLowerCase()}`" @click="exportRows('csv')">Export CSV</button>
      <button class="btn btn-outline-success" type="button" :disabled="unavailable || exporting || !sortedRows.length" :aria-label="`Export PDF for ${title.toLowerCase()}`" @click="exportRows('pdf')">Export PDF</button>
      <span>All matching records across pages, in the current sort order.</span>
      <p v-if="exporting" role="status">Preparing your download…</p>
      <p v-if="exportMessage" role="status">{{ exportMessage }}</p>
      <p v-if="exportError" role="alert">{{ exportError }}</p>
    </div>

    <p :id="`${id}-help`" class="table-help">Select a column heading to sort. Use the fields below each heading to filter that column.</p>
    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <p v-else-if="loading" class="table-message" role="status">Loading {{ title.toLowerCase() }}…</p>
    <template v-else>
      <div class="table-scroll" role="region" :aria-label="`${title} table, scroll horizontally if needed`" tabindex="0">
        <table :id="`${id}-table`" class="table align-middle data-table" :aria-describedby="`${id}-help`">
          <caption class="visually-hidden">{{ title }}. {{ TABLE_PAGE_SIZE }} rows per page.</caption>
          <thead>
            <tr>
              <th v-for="column in columns" :key="column.key" scope="col"
                :aria-sort="column.sortable === false ? undefined : sortKey === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'">
                <button v-if="column.sortable !== false" class="table-sort" type="button" :aria-label="sortLabel(column)" @click="sortBy(column.key)">
                  {{ column.label }}
                  <span aria-hidden="true">{{ sortKey === column.key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕' }}</span>
                </button>
                <span v-else>{{ column.label }}</span>
              </th>
            </tr>
            <tr class="column-filters">
              <td v-for="column in columns" :key="column.key">
                <template v-if="column.searchable !== false">
                  <label class="visually-hidden" :for="`${id}-filter-${column.key}`">Filter {{ title.toLowerCase() }} by {{ column.label.toLowerCase() }}</label>
                  <input :id="`${id}-filter-${column.key}`" v-model="filters[column.key]" class="form-control form-control-sm" type="search"
                    :placeholder="`Filter ${column.label.toLowerCase()}`" :aria-controls="`${id}-table`">
                </template>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in visibleRows" :key="row.id">
              <td v-for="column in columns" :key="column.key">
                <slot :name="`cell-${column.key}`" :row="row" :value="cellValue(row, column)">{{ cellValue(row, column) }}</slot>
              </td>
            </tr>
            <tr v-if="!visibleRows.length">
              <td :colspan="columns.length" class="table-empty">
                {{ rows.length ? 'No records match these filters. Try another search or clear the filters.' : emptyMessage }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <p role="status" aria-live="polite" aria-atomic="true">
          Showing {{ firstRow }}–{{ lastRow }} of {{ filteredRows.length }}{{ hasFilters ? ` matching records (${rows.length} total)` : ' records' }}
          <span class="page-size">{{ TABLE_PAGE_SIZE }} per page</span>
        </p>
        <nav class="table-pagination" :aria-label="`${title} pagination`">
          <button type="button" class="btn btn-outline-success btn-sm" :disabled="page === 1" :aria-label="`Previous page of ${title.toLowerCase()}`" @click="goToPage(page - 1)">Previous</button>
          <span>Page {{ page }} of {{ pageCount }}</span>
          <button type="button" class="btn btn-outline-success btn-sm" :disabled="page === pageCount" :aria-label="`Next page of ${title.toLowerCase()}`" @click="goToPage(page + 1)">Next</button>
        </nav>
      </div>
    </template>
  </section>
</template>

<style scoped>
.export-toolbar { display: flex; gap: .7rem; flex-wrap: wrap; align-items: center; padding: .5rem 1.25rem 1rem; color: #435047; font-size: .9rem; }
.export-toolbar p { width: 100%; margin: 0; }
.interactive-table {
  min-width: 0;
  margin-top: 1.75rem;
  border: 1px solid rgba(31, 41, 51, 0.12);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(31, 41, 51, 0.05);
  overflow: hidden;
}
.table-intro, .table-toolbar, .table-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.25rem; }
.table-intro { align-items: flex-start; padding-bottom: .5rem; }
.table-intro h2 { color: #173f2f; font-size: 1.5rem; font-weight: 800; margin: 0 0 .4rem; }
.table-intro p, .table-footer p { color: #526071; margin: 0; }
.table-count { color: #216e4e; background: #e3f2e9; border-radius: 999px; padding: .35rem .75rem; white-space: nowrap; font-weight: 700; }
.table-toolbar { align-items: end; padding-bottom: .75rem; }
.table-search { width: min(100%, 440px); }
.table-search label { font-weight: 700; margin-bottom: .4rem; }
.table-help, .table-message { color: #526071; padding: 0 1.25rem; font-size: .9rem; }
.alert { margin: 1.25rem; }
.table-scroll { position: relative; max-width: 100%; overflow-x: auto; }
.data-table { margin: 0; min-width: 720px; }
.data-table th { background: #edf6f0; color: #173f2f; vertical-align: middle; white-space: nowrap; }
.data-table th, .data-table td { padding: .85rem; }
.data-table td { color: #263241; min-width: 120px; max-width: 300px; overflow-wrap: anywhere; }
.data-table th:first-child, .data-table td:first-child { padding-left: 1.25rem; }
.table-sort { display: flex; align-items: center; gap: .5rem; width: 100%; border: 0; background: transparent; color: inherit; padding: .2rem 0; text-align: left; font-weight: 750; }
.table-sort:hover { color: #216e4e; text-decoration: underline; }
.column-filters td { background: #f7faf8; padding-top: .6rem; padding-bottom: .6rem; }
.column-filters input { min-width: 115px; }
.table-empty { text-align: center; padding: 2rem !important; color: #526071 !important; }
.table-footer { flex-wrap: wrap; border-top: 1px solid #e0e6e2; font-size: .9rem; }
.page-size { display: block; font-size: .8rem; margin-top: .15rem; }
.table-pagination { display: flex; align-items: center; gap: .8rem; flex-wrap: wrap; }
button:focus-visible, .table-scroll:focus-visible { outline: 3px solid #216e4e; outline-offset: 3px; }
.form-control:focus { border-color: #216e4e; box-shadow: 0 0 0 .2rem rgba(33, 110, 78, .18); }
@media (max-width: 575.98px) {
  .table-toolbar { flex-wrap: wrap; }
  .table-search { width: 100%; }
  .table-intro, .table-toolbar, .table-footer { padding-left: 1rem; padding-right: 1rem; }
  .table-count { font-size: .85rem; }
  .table-intro h2 { font-size: 1.3rem; }
}
</style>
