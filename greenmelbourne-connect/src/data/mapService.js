export const travelModes = [
  { value: 'walk', label: 'Walking' },
  { value: 'bicycle', label: 'Cycling' },
]
export const melbourneBounds = { west: 144.5, south: -38.3, east: 145.55, north: -37.4 }

export function isMelbournePoint(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lon)
    && point.lat >= melbourneBounds.south && point.lat <= melbourneBounds.north
    && point.lon >= melbourneBounds.west && point.lon <= melbourneBounds.east
}
export function formatDistance(metres) {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`
}
export function formatDuration(seconds) {
  const minutes = Math.max(1, Math.ceil(seconds / 60))
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
}

function parseRoute(data) {
  const feature = data?.features?.[0]
  if (!feature) throw new Error('No route was found. Choose another starting point or travel mode.')
  const { geometry, properties } = feature
  const lines = geometry?.type === 'MultiLineString' ? geometry.coordinates
    : geometry?.type === 'LineString' ? [geometry.coordinates] : null
  const validCoordinate = (point) => Array.isArray(point) && point.length >= 2
    && Number.isFinite(point[0]) && Math.abs(point[0]) <= 180
    && Number.isFinite(point[1]) && Math.abs(point[1]) <= 90
  if (!Array.isArray(lines) || !lines.length
    || !lines.every((line) => Array.isArray(line) && line.length >= 2 && line.every(validCoordinate))
    || !Number.isFinite(properties?.distance) || properties.distance < 0
    || !Number.isFinite(properties?.time) || properties.time < 0) {
    throw new Error('The route service returned an incomplete route. Please try again.')
  }
  return {
    distance: properties.distance,
    duration: properties.time,
    feature: { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } },
  }
}

export function createMapService(apiKey, fetchImpl = globalThis.fetch) {
  const placeCache = new Map()
  async function request(path, params, signal) {
    if (!apiKey) throw new Error('Map services are not configured yet. Please try again later.')
    const url = new URL(path, 'https://api.geoapify.com')
    for (const [key, value] of Object.entries({ ...params, apiKey })) url.searchParams.set(key, value)
    const controller = new AbortController()
    const abort = () => controller.abort()
    const timer = setTimeout(abort, 12000)
    signal?.addEventListener('abort', abort, { once: true })
    try {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
      const response = await fetchImpl(url, { signal: controller.signal, credentials: 'omit' })
      if (!response.ok) {
        if (response.status === 429) throw new Error('The map service is busy or its daily limit has been reached. Try again later.')
        if ([401, 403].includes(response.status)) throw new Error('The map service is unavailable on this website. Please contact the organiser.')
        throw new Error('The map service could not complete the request. Please try again.')
      }
      return await response.json()
    } catch (error) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
      if (controller.signal.aborted) throw new Error('The map request timed out. Please try again.')
      if (error instanceof TypeError || error instanceof SyntaxError) {
        throw new Error('The map service could not be reached. Check your connection and try again.')
      }
      throw error
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }

  return {
    async searchPlaces(text, signal) {
      const query = text.trim()
      if (query.length < 3 || query.length > 120) throw new Error('Enter a place or address using 3–120 characters.')
      const cacheKey = query.toLowerCase()
      if (placeCache.has(cacheKey)) return placeCache.get(cacheKey)
      const { west, south, east, north } = melbourneBounds
      const data = await request('/v1/geocode/search', {
        text: query, filter: `rect:${west},${south},${east},${north}|countrycode:au`,
        bias: 'proximity:144.9631,-37.8136', limit: 5, lang: 'en', format: 'json',
      }, signal)
      if (!Array.isArray(data?.results)) throw new Error('The place service returned an incomplete result. Please try again.')
      const places = data.results.filter((item) => isMelbournePoint(item) && typeof item.formatted === 'string')
        .slice(0, 5).map((item, index) => ({
          id: `${item.lat},${item.lon},${index}`, lat: item.lat, lon: item.lon,
          label: item.formatted.slice(0, 500),
        }))
      if (placeCache.size >= 30) placeCache.delete(placeCache.keys().next().value)
      placeCache.set(cacheKey, places)
      return places
    },
    async getRoute(origin, destination, mode, signal) {
      if (!isMelbournePoint(origin) || !isMelbournePoint(destination)) {
        throw new Error('Choose a starting point and activity in the Melbourne area.')
      }
      if (!travelModes.some((item) => item.value === mode)) throw new Error('Choose walking or cycling.')
      if (Math.abs(origin.lat - destination.lat) < 0.00005 && Math.abs(origin.lon - destination.lon) < 0.00005) {
        throw new Error('Your starting point is already at the meeting point. Choose a different starting point to plan a trip.')
      }
      return parseRoute(await request('/v1/routing', {
        waypoints: `${origin.lat},${origin.lon}|${destination.lat},${destination.lon}`,
        mode, units: 'metric', lang: 'en', format: 'geojson',
      }, signal))
    },
  }
}
