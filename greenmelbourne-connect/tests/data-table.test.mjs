import { test } from 'node:test'
import assert from 'node:assert/strict'
import { effectScope, ref } from 'vue'
import { useDataTable } from '../src/composables/useDataTable.js'
import { activityColumns, registrationColumns } from '../src/data/tableColumns.js'

const activities = Array.from({ length: 23 }, (_, index) => ({
  id: String(index + 1), title: `Activity ${index + 1}`, suburb: index % 2 ? 'Box Hill' : 'Clayton',
  type: index % 3 ? 'Tree planting' : 'Workshop', places: index + 2,
  date: `${String(index + 1).padStart(2, '0')} October 2026`,
}))
function table(t, rows = activities, columns = activityColumns, sort = {}) {
  const scope = effectScope(), data = ref(structuredClone(rows))
  const model = scope.run(() => useDataTable(data, columns, sort))
  t.after(() => scope.stop())
  return { ...model, data }
}

test('23 records split into 10, 10 and 3 rows with correct navigation boundaries', (t) => {
  const view = table(t)
  assert.equal(view.visibleRows.value.length, 10)
  assert.equal(view.firstRow.value, 1)
  assert.equal(view.lastRow.value, 10)
  view.goToPage(2)
  assert.equal(view.visibleRows.value[0].id, '11')
  assert.equal(view.lastRow.value, 20)
  view.goToPage(999)
  assert.equal(view.page.value, 3)
  assert.equal(view.visibleRows.value.length, 3)
  assert.equal(view.firstRow.value, 21)
  assert.equal(view.lastRow.value, 23)
  view.goToPage(-1)
  assert.equal(view.page.value, 1)
})
test('column filters combine with global search, trim whitespace and ignore case', (t) => {
  const view = table(t)
  view.goToPage(3)
  view.filters.suburb = ' CLAYTON '
  view.filters.type = 'workshop'
  view.search.value = 'ACTIVITY 1'
  assert.equal(view.page.value, 1)
  assert.deepEqual(view.visibleRows.value.map((row) => row.id), ['1', '13', '19'])
  view.clearFilters()
  assert.equal(view.filteredRows.value.length, 23)
  assert.equal(view.hasFilters.value, false)
})
test('numeric and natural text sorting run over the whole result set before pagination', (t) => {
  const view = table(t)
  view.sortBy('places')
  assert.equal(view.visibleRows.value[0].places, 2)
  view.sortBy('places')
  assert.equal(view.visibleRows.value[0].places, 24)
  view.sortBy('title')
  assert.deepEqual(view.visibleRows.value.slice(0, 3).map((row) => row.title), ['Activity 1', 'Activity 2', 'Activity 3'])
  assert.equal(view.data.value[0].id, '1', 'sorting does not mutate the Firestore source')
})
test('readable dates sort chronologically across different weekdays, months and years', (t) => {
  const view = table(t, [
    { id: '3', date: 'Friday 1 January 2027' },
    { id: '1', date: 'Sunday 20 September 2026' },
    { id: '2', date: 'Saturday 17 October 2026' },
    { id: '4', date: '2027-02-01' },
    { id: 'missing', date: '' },
  ], activityColumns, { key: 'date' })
  assert.deepEqual(view.visibleRows.value.map((row) => row.id), ['1', '2', '3', '4', 'missing'])
  view.sortBy('date')
  assert.deepEqual(view.visibleRows.value.map((row) => row.id), ['4', '3', '2', '1', 'missing'])
})
test('live deletions on the last page move back to a valid page and new data does not jump forward', (t) => {
  const view = table(t)
  view.goToPage(3)
  view.data.value = view.data.value.slice(0, 20)
  assert.equal(view.page.value, 2)
  assert.equal(view.visibleRows.value.length, 10)
  view.data.value = [...view.data.value, { ...activities[20] }]
  assert.equal(view.page.value, 2)
  view.data.value = []
  assert.equal(view.page.value, 1)
  assert.equal(view.firstRow.value, 0)
  assert.equal(view.lastRow.value, 0)
})
test('zero matches and whitespace-only filters have useful empty/reset behavior', (t) => {
  const view = table(t)
  view.filters.suburb = 'no such place'
  assert.equal(view.visibleRows.value.length, 0)
  assert.equal(view.pageCount.value, 1)
  assert.equal(view.firstRow.value, 0)
  view.clearFilters()
  view.search.value = '   '
  assert.equal(view.filteredRows.value.length, 23)
  assert.equal(view.hasFilters.value, false)
})
test('registration fields and follow-up status updates filter correctly without affecting the other table', (t) => {
  const eventView = table(t)
  const view = table(t, [
    { id: 'a', fullName: 'Alice', email: 'alice@example.test', eventTitle: 'Planting', reason: 'Native habitat', suburb: 'Clayton', status: 'Waiting', createdAt: { seconds: 100 } },
    { id: 'b', fullName: 'Bob', email: 'bob@example.test', eventTitle: 'Workshop', reason: 'Garden care', suburb: 'Box Hill', status: 'Contacted', createdAt: { seconds: 200 } },
  ], registrationColumns, { key: 'createdAt', direction: 'desc' })
  assert.equal(view.visibleRows.value[0].id, 'b')
  view.filters.email = 'ALICE@'
  view.filters.status = 'waiting'
  view.search.value = 'native'
  assert.deepEqual(view.visibleRows.value.map((row) => row.id), ['a'])
  view.data.value[0].status = 'Contacted'
  assert.equal(view.visibleRows.value.length, 0)
  assert.equal(eventView.filteredRows.value.length, 23)
  assert.equal(eventView.hasFilters.value, false)
  view.clearFilters()
  view.sortBy('actions')
  assert.equal(view.sortKey.value, 'createdAt', 'action buttons are not sortable data')
})
test('both table instances maintain independent pagination and sorting', (t) => {
  const first = table(t), second = table(t)
  first.goToPage(3)
  second.sortBy('places')
  second.search.value = 'Box Hill'
  assert.equal(first.page.value, 3)
  assert.equal(first.sortKey.value, '')
  assert.equal(first.filteredRows.value.length, 23)
  assert.equal(second.page.value, 1)
  assert.equal(second.filteredRows.value.length, 11)
})
