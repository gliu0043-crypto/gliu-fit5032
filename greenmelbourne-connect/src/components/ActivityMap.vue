<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  apiKey: { type: String, required: true },
  activities: { type: Array, required: true },
  selectedId: { type: String, default: '' },
  origin: { type: Object, default: null },
  route: { type: Object, default: null },
})
const emit = defineEmits(['select'])
const container = ref(null), tileError = ref(false)
let map, markers, routeLayer, tileLayer, observer

function icon(kind) {
  return L.divIcon({
    className: `trip-marker trip-marker-${kind}`,
    html: `<span>${kind === 'start' ? 'S' : kind === 'selected' ? 'A' : '•'}</span>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  })
}
function renderMap() {
  if (!map) return
  markers.clearLayers()
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null }
  const groups = new Map()
  for (const activity of props.activities) {
    const key = `${activity.location.lat},${activity.location.lon}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(activity)
  }
  for (const group of groups.values()) {
    const location = group[0].location
    const selected = group.some((activity) => activity.id === props.selectedId)
    const popup = document.createElement('div')
    const heading = document.createElement('strong')
    heading.textContent = location.label
    popup.append(heading)
    for (const activity of group) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'map-popup-button'
      button.textContent = `Choose ${activity.title}`
      button.addEventListener('click', () => emit('select', activity.id))
      popup.append(button)
    }
    L.marker([location.lat, location.lon], {
      icon: icon(selected ? 'selected' : 'activity'),
      title: location.label, alt: location.label,
    }).bindPopup(popup).addTo(markers)
  }
  if (props.origin) {
    const label = document.createElement('span')
    label.textContent = `Start: ${props.origin.label}`
    L.marker([props.origin.lat, props.origin.lon], {
      icon: icon('start'), title: 'Your starting point', alt: 'Your starting point',
    }).bindPopup(label).addTo(markers)
  }
  if (props.route) {
    routeLayer = L.geoJSON(props.route.feature, { style: { color: '#245bb2', weight: 5, opacity: 0.9 } }).addTo(map)
    map.fitBounds(routeLayer.getBounds(), { padding: [35, 35], maxZoom: 16 })
  } else {
    const selected = props.activities.find((activity) => activity.id === props.selectedId)
    const points = [props.origin, selected?.location].filter(Boolean)
    if (points.length) map.fitBounds(points.map((point) => [point.lat, point.lon]), { padding: [40, 40], maxZoom: 14 })
    else showAll()
  }
}
function showAll() {
  if (!map || !props.activities.length) return
  map.fitBounds(props.activities.map((activity) => [activity.location.lat, activity.location.lon]), { padding: [30, 30], maxZoom: 12 })
}
function retryTiles() { tileError.value = false; tileLayer?.redraw() }

onMounted(() => {
  map = L.map(container.value, { scrollWheelZoom: false }).setView([-37.8136, 144.9631], 11)
  tileLayer = L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(props.apiKey)}`, {
    maxZoom: 19,
    attribution: 'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
  }).on('tileerror', () => { tileError.value = true }).addTo(map)
  markers = L.layerGroup().addTo(map)
  observer = new ResizeObserver(() => map?.invalidateSize())
  observer.observe(container.value)
  renderMap()
})
watch(() => [props.activities, props.selectedId, props.origin, props.route], renderMap)
onBeforeUnmount(() => { observer?.disconnect(); map?.remove(); map = null })
</script>

<template>
  <div>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
      <span class="map-legend">Green: activities · Orange A: destination · Blue S: start</span>
      <button class="btn btn-outline-success btn-sm" type="button" @click="showAll">Show all activities</button>
    </div>
    <div v-if="tileError" class="alert alert-warning" role="alert">
      Map tiles could not load. Check your connection or try again later.
      <button class="btn btn-outline-dark btn-sm ms-2" type="button" @click="retryTiles">Retry map</button>
    </div>
    <div ref="container" class="activity-map" role="region" aria-label="Melbourne activity and route map"></div>
    <p class="form-hint mt-2 mb-0">Choose an activity using its marker or the activity list. Use + and − to zoom.</p>
  </div>
</template>
