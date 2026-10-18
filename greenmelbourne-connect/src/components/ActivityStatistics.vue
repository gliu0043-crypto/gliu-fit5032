<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, DoughnutController, ArcElement, Tooltip } from 'chart.js'
import { activityStatistics } from '../data/statistics'
Chart.register(BarController, BarElement, CategoryScale, LinearScale, DoughnutController, ArcElement, Tooltip)
const props = defineProps({ events: { type: Array, required: true }, registrations: { type: Array, required: true }, loading: Boolean, error: String })
const filters = reactive({ type: '', suburb: '', activity: '', status: '' })
const types = computed(() => [...new Set(props.events.map(event => event.type))].sort())
const suburbs = computed(() => [...new Set(props.events.map(event => event.suburb))].sort())
const choices = computed(() => props.events.filter(event => (!filters.type || event.type === filters.type) && (!filters.suburb || event.suburb === filters.suburb)))
const stats = computed(() => activityStatistics(props.events, props.registrations, filters))
const barCanvas = ref(null), statusCanvas = ref(null), chartError = ref('')
let bars, pie, disposed = false
function reset() { Object.assign(filters, { type: '', suburb: '', activity: '', status: '' }) }
function selectActivity(id) { filters.activity = id }
function selectStatus(status) { filters.status = filters.status === status ? '' : status }
function clearCharts() { bars?.destroy(); pie?.destroy(); bars = pie = null }
watch(() => [filters.type, filters.suburb], () => { filters.activity = '' })
async function draw() {
  await nextTick()
  clearCharts()
  if (disposed || props.loading || props.error || !barCanvas.value) return
  chartError.value = ''
  try {
    const rows = stats.value.activities
    bars = new Chart(barCanvas.value, {
      type: 'bar',
      data: { labels: rows.map(row => row.title), datasets: [{ label: 'Registrations', data: rows.map(row => row.count), backgroundColor: '#216e4e', borderColor: '#173f2f', borderWidth: 1 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false, indexAxis: 'y',
        scales: { x: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Number of registrations' } }, y: { ticks: { callback(value) { const title = this.getLabelForValue(value); return title.length > 28 ? title.slice(0, 27) + '…' : title } } } },
        onClick: (_, elements) => { if (elements.length) selectActivity(rows[elements[0].index].id) },
      },
    })
    if (statusCanvas.value && stats.value.total) pie = new Chart(statusCanvas.value, {
      type: 'doughnut',
      data: { labels: ['Waiting', 'Contacted'], datasets: [{ data: [stats.value.waiting, stats.value.contacted], backgroundColor: ['#985800', '#216e4e'], borderColor: '#fff', borderWidth: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, animation: false, onClick: (_, elements) => { if (elements.length) selectStatus(['Waiting', 'Contacted'][elements[0].index]) } },
    })
  } catch { chartError.value = 'The charts could not load. The same figures and filters are available in the data table below.' }
}
onMounted(draw)
watch([stats, () => props.loading, () => props.error], draw, { flush: 'post' })
onBeforeUnmount(() => { disposed = true; clearCharts() })
</script>
<template>
  <section class="statistics-panel" aria-labelledby="statistics-heading" :aria-busy="loading">
    <h2 id="statistics-heading">Activity insights</h2>
    <p>Explore registrations by activity and follow-up status. Counts represent expressions of interest, not confirmed places or unique people.</p>
    <fieldset :disabled="loading || Boolean(error)">
      <legend class="visually-hidden">Filter activity insights</legend>
      <div class="row g-3">
        <div class="col-12 col-md-4"><label class="form-label" for="insight-type">Activity type</label><select id="insight-type" v-model="filters.type" class="form-select"><option value="">All types</option><option v-for="type in types" :key="type">{{ type }}</option></select></div>
        <div class="col-12 col-md-4"><label class="form-label" for="insight-suburb">Activity suburb</label><select id="insight-suburb" v-model="filters.suburb" class="form-select"><option value="">All suburbs</option><option v-for="suburb in suburbs" :key="suburb">{{ suburb }}</option></select></div>
        <div class="col-12 col-md-4"><label class="form-label" for="insight-activity">Activity</label><select id="insight-activity" v-model="filters.activity" class="form-select"><option value="">All matching activities</option><option v-for="event in choices" :key="event.id" :value="event.id">{{ event.title }}</option></select></div>
      </div>
      <div class="insight-actions" role="group" aria-label="Filter insights by follow-up status">
        <button type="button" class="btn btn-outline-success" :aria-pressed="filters.status === ''" @click="filters.status = ''">All statuses</button>
        <button v-for="status in ['Waiting', 'Contacted']" :key="status" type="button" class="btn btn-outline-success" :aria-pressed="filters.status === status" @click="selectStatus(status)">{{ status }}</button>
        <button type="button" class="btn btn-outline-dark" @click="reset">Reset insights</button>
      </div>
    </fieldset>
    <p v-if="loading" role="status">Loading activity insights…</p>
    <p v-else-if="error" role="alert" class="alert alert-danger">{{ error }}</p>
    <template v-else>
      <p role="status">{{ stats.total }} registrations across {{ stats.activities.length }} activities. Waiting: {{ stats.waiting }}. Contacted: {{ stats.contacted }}.</p>
      <p v-if="chartError" role="alert">{{ chartError }}</p>
      <div class="row g-4">
        <div class="col-12 col-lg-8">
          <h3>Registrations by activity</h3>
          <p id="bar-help">Click a bar to focus on an activity, or use the Activity selector and table buttons. Hover over a bar to see its full name and count.</p>
          <div class="bar-scroll" tabindex="0" role="region" aria-label="Registrations bar chart, scroll to see more activities"><div :style="{ height: `${Math.max(220, stats.activities.length * 36)}px` }"><canvas ref="barCanvas" role="img" aria-label="Registrations by activity. Exact figures are in the data table below." aria-describedby="bar-help"></canvas></div></div>
        </div>
        <div class="col-12 col-lg-4">
          <h3>Follow-up status</h3>
          <div v-if="stats.total" class="pie-wrap"><canvas ref="statusCanvas" role="img" :aria-label="`Waiting: ${stats.waiting}. Contacted: ${stats.contacted}. Use the status buttons to filter.`"></canvas></div>
          <p v-else>No registrations match these filters.</p>
          <p>Waiting: <strong>{{ stats.waiting }}</strong> · Contacted: <strong>{{ stats.contacted }}</strong></p>
        </div>
      </div>
      <details class="mt-3">
        <summary>View chart data as a table</summary>
        <div class="insight-table-scroll" role="region" aria-label="Chart data" tabindex="0">
          <table class="table"><caption>Registrations per activity for the current insight filters</caption><thead><tr><th scope="col">Activity</th><th scope="col">Registrations</th><th scope="col">Explore</th></tr></thead>
            <tbody><tr v-for="row in stats.activities" :key="row.id"><th scope="row">{{ row.title }}</th><td>{{ row.count }}</td><td><button type="button" class="btn btn-outline-success btn-sm" :aria-label="`Focus on ${row.title}`" @click="selectActivity(row.id)">Focus</button></td></tr><tr v-if="!stats.activities.length"><td colspan="3">No activities match these filters.</td></tr></tbody>
          </table>
        </div>
      </details>
    </template>
  </section>
</template>
<style scoped>
.statistics-panel { padding: 1.5rem; border: 1px solid #cbd9cd; background: #fff; border-radius: 8px; margin: 1.75rem 0; }
h2 { font-size: 1.5rem; color: #173f2f; font-weight: 800; } h3 { font-size: 1.15rem; color: #173f2f; }
.insight-actions { display: flex; gap: .6rem; flex-wrap: wrap; margin: 1rem 0; }
[aria-pressed=true] { background: #173f2f; color: #fff; }
.bar-scroll { max-height: 510px; overflow-y: auto; }
.pie-wrap { height: 250px; }
.insight-table-scroll { overflow-x: auto; }
summary { cursor: pointer; color: #173f2f; font-weight: 700; padding: .5rem 0; }
fieldset { min-width: 0; }
@media(max-width: 575.98px) { .statistics-panel { padding: 1rem; } }
</style>
