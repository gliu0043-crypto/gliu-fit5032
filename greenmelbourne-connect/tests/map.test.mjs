import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computed, effectScope, ref } from 'vue'
import { createMapService, formatDistance, formatDuration, isMelbournePoint } from '../src/data/mapService.js'
import { getActivityLocation } from '../src/data/activityLocations.js'
import { useTripPlanner } from '../src/composables/useTripPlanner.js'

const start = { lat: -37.8136, lon: 144.9631, label: 'Melbourne' }
const end = { lat: -37.9252, lon: 145.1198, label: 'Clayton sample meeting point' }
const routeData = { features: [{ type: 'Feature', geometry: {
  type: 'MultiLineString', coordinates: [[[144.9631, -37.8136], [145.1198, -37.9252]]],
}, properties: { distance: 21500, time: 4300 } }] }
const response = (data, status = 200) => new Response(JSON.stringify(data), { status })
const defer = () => { let resolve; const promise = new Promise((done) => { resolve = done }); return { promise, resolve } }

test('all 30 catalogue activities have valid, explicitly labelled demonstration locations', () => {
  const activities = JSON.parse(readFileSync(new URL('../scripts/data/events.json', import.meta.url)))
  assert.equal(activities.length, 30)
  for (const activity of activities) {
    const location = getActivityLocation(activity)
    assert.ok(isMelbournePoint(location), activity.title)
    assert.match(location.label, /sample meeting point/)
  }
  assert.equal(getActivityLocation({ suburb: 'Unknown place' }), null)
})

test('place search is Melbourne-limited, safely encodes input and reuses identical searches', async () => {
  const urls = []
  const service = createMapService('test-key', async (url) => {
    urls.push(url)
    return response({ results: [
      { ...start, formatted: 'Melbourne, Victoria' },
      { lat: 51.5, lon: -0.1, formatted: 'Outside Melbourne' },
      { lat: null, lon: null, formatted: 'Invalid coordinates' },
    ] })
  })
  const places = await service.searchPlaces(' Melbourne & Carlton ')
  assert.equal(places.length, 1)
  assert.equal(urls[0].searchParams.get('text'), 'Melbourne & Carlton')
  assert.match(urls[0].searchParams.get('filter'), /rect:.*countrycode:au/)
  assert.equal(urls[0].searchParams.get('limit'), '5')
  await service.searchPlaces('melbourne & carlton')
  assert.equal(urls.length, 1)
  await assert.rejects(service.searchPlaces('ab'), /3–120/)
  assert.equal(urls.length, 1)
})

test('route requests use latitude-longitude waypoints and preserve GeoJSON longitude-latitude geometry', async () => {
  let requestUrl
  const service = createMapService('test-key', async (url) => { requestUrl = url; return response(routeData) })
  const route = await service.getRoute(start, end, 'bicycle')
  assert.equal(requestUrl.searchParams.get('waypoints'), '-37.8136,144.9631|-37.9252,145.1198')
  assert.equal(requestUrl.searchParams.get('mode'), 'bicycle')
  assert.equal(requestUrl.searchParams.get('units'), 'metric')
  assert.deepEqual(route.feature.geometry, routeData.features[0].geometry)
  assert.equal(formatDistance(route.distance), '21.5 km')
  assert.equal(formatDuration(route.duration), '1 hr 12 min')
  assert.equal(formatDistance(250), '250 m')
  assert.equal(formatDuration(20), '1 min')
})

test('missing configuration, invalid endpoints and same-point trips do not call the provider', async () => {
  let calls = 0
  const fetcher = async () => { calls++; return response(routeData) }
  await assert.rejects(createMapService('', fetcher).searchPlaces('Clayton'), /not configured/)
  const service = createMapService('test-key', fetcher)
  await assert.rejects(service.getRoute(start, { lat: 200, lon: 0 }, 'walk'), /Melbourne area/)
  await assert.rejects(service.getRoute(start, end, 'drive'), /walking or cycling/)
  await assert.rejects(service.getRoute(start, start, 'walk'), /already at/)
  assert.equal(calls, 0)
})

test('empty, malformed and failed provider responses display actionable errors', async () => {
  const fixtures = [
    [response({ features: [] }), /No route/],
    [response({ features: [{ geometry: {}, properties: { distance: 10, time: 10 } }] }), /incomplete route/],
    [response({ providerMessage: 'secret details' }, 403), /unavailable on this website/],
    [response({}, 429), /daily limit/],
    [response({}, 500), /could not complete/],
  ]
  for (const [result, message] of fixtures) {
    await assert.rejects(createMapService('test-key', async () => result).getRoute(start, end, 'walk'), message)
  }
  await assert.rejects(createMapService('test-key', async () => { throw new TypeError('url?apiKey=test-key') })
    .searchPlaces('Clayton'), (error) => /connection/.test(error.message) && !error.message.includes('test-key'))
})

function planner(t, overrides = {}) {
  const scope = effectScope(), destination = ref(end)
  const service = { searchPlaces: async () => [start], getRoute: async () => routeData, ...overrides }
  const model = scope.run(() => useTripPlanner(service, computed(() => destination.value)))
  t.after(() => scope.stop())
  return { ...model, destination, scope }
}

test('editing search while a request is pending discards stale results even if provider ignores abort', async (t) => {
  const pending = defer()
  const view = planner(t, { searchPlaces: () => pending.promise })
  view.query.value = 'Clayton'
  const searching = view.search()
  view.query.value = 'Carlton'
  pending.resolve([start])
  await searching
  assert.deepEqual(view.results.value, [])
  assert.equal(view.searched.value, false)
  assert.equal(view.searchLoading.value, false)
})

test('changing destination or mode clears old routes and rejects late route responses', async (t) => {
  const pending = defer()
  const view = planner(t, { getRoute: () => pending.promise })
  view.selectOrigin(start)
  const planning = view.planRoute()
  view.destination.value = { lat: -37.8, lon: 145, label: 'Another activity' }
  pending.resolve(routeData)
  await planning
  assert.equal(view.route.value, null)
  assert.equal(view.routeLoading.value, false)
  await view.planRoute()
  assert.ok(view.route.value)
  view.mode.value = 'bicycle'
  assert.equal(view.route.value, null)
})

test('changing search invalidates the selected origin and clear trip cancels pending work', async (t) => {
  const view = planner(t)
  view.query.value = 'Melbourne'
  await view.search()
  view.selectOrigin(view.results.value[0])
  await view.planRoute()
  assert.ok(view.canPlan.value)
  view.query.value = 'Clayton'
  assert.equal(view.origin.value, null)
  assert.equal(view.route.value, null)
  assert.equal(view.canPlan.value, false)
  view.mode.value = 'bicycle'
  view.reset()
  assert.equal(view.query.value, '')
  assert.equal(view.mode.value, 'walk')
  assert.deepEqual(view.results.value, [])
})
