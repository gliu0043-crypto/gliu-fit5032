import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ref } from 'vue'
import { createCsv, csvCell, exportTable } from '../src/data/export.js'
import { useDataTable } from '../src/composables/useDataTable.js'
import { activityStatistics } from '../src/data/statistics.js'

test('CSV keeps Unicode, quotes, commas and line breaks and neutralises formula prefixes', () => {
  const table = { headers: ['Name', 'Notes'], body: [['刘同学', 'hello,"world"\nnew line'], [' =HYPERLINK("x")', '\t=1+1']] }
  const csv = createCsv(table)
  assert(csv.startsWith('\uFEFF'))
  assert(csv.includes('"刘同学"'))
  assert(csv.includes('"hello,""world""\nnew line"'))
  assert(csv.includes('"\' =HYPERLINK'))
  assert(csv.includes('"\'\t=1+1"'))
  for (const value of ['=1+1', '+cmd', '-1', '@SUM(A1)', '\r=1', ' \n@SUM(A1)']) assert(csvCell(value).startsWith('"\''))
})
test('export includes every sorted, filtered row across pages and only permitted display columns', () => {
  const rows = ref(Array.from({ length: 30 }, (_, i) => ({ id: i, name: `Volunteer ${i}`, count: i, secret: 'not exported' })))
  const columns = [{ key: 'name', label: 'Name' }, { key: 'count', label: 'Count' }, { key: 'secret', label: 'Secret', exportable: false }, { key: 'actions', label: 'Actions' }]
  const table = useDataTable(rows, ref(columns), { key: 'count', direction: 'desc' })
  assert.equal(table.visibleRows.value.length, 10)
  const result = exportTable(table.sortedRows.value, columns)
  assert.deepEqual(result.headers, ['Name', 'Count'])
  assert.equal(result.body.length, 30)
  assert.equal(result.body[0][1], '29')
  table.search.value = 'Volunteer 1'
  assert.equal(exportTable(table.sortedRows.value, columns).body.length, 11)
  table.search.value = 'missing'
  assert.equal(exportTable(table.sortedRows.value, columns).body.length, 0)
})
test('statistics reconcile activity, suburb, type and status filters without mutating data', () => {
  const events = [{ id: 'a', title: 'Planting', suburb: 'Clayton', type: 'Trees' }, { id: 'b', title: 'Workshop', suburb: 'Clayton', type: 'Learning' }, { id: 'c', title: 'Habitat', suburb: 'Box Hill', type: 'Trees' }]
  const registrations = [{ eventId: 'a', status: 'Waiting' }, { eventId: 'a', status: 'Contacted' }, { eventId: 'b' }, { eventId: 'deleted', status: 'Contacted' }]
  const snapshot = JSON.stringify([events, registrations])
  const all = activityStatistics(events, registrations)
  assert.equal(all.total, 3)
  assert.equal(all.waiting + all.contacted, all.total)
  assert.equal(all.activities.find(row => row.id === 'c').count, 0)
  assert.equal(activityStatistics(events, registrations, { type: 'Trees', suburb: 'Clayton', status: 'Contacted' }).total, 1)
  assert.equal(activityStatistics(events, registrations, { activity: 'b' }).waiting, 1)
  assert.equal(activityStatistics(events, registrations, { suburb: 'Missing' }).total, 0)
  assert.equal(JSON.stringify([events, registrations]), snapshot)
})
