import { computed, onScopeDispose, ref, watch } from 'vue'

export function useTripPlanner(service, destination) {
  const query = ref(''), results = ref([]), searched = ref(false), origin = ref(null)
  const searchLoading = ref(false), searchError = ref(''), mode = ref('walk')
  const route = ref(null), routeLoading = ref(false), routeError = ref('')
  let searchVersion = 0, routeVersion = 0, searchController, routeController

  function cancelSearch() {
    searchVersion++
    searchController?.abort()
    searchLoading.value = false
    results.value = []
    searched.value = false
    searchError.value = ''
  }
  function clearRoute() {
    routeVersion++
    routeController?.abort()
    routeLoading.value = false
    route.value = null
    routeError.value = ''
  }
  watch(query, () => { cancelSearch(); origin.value = null }, { flush: 'sync' })
  watch([origin, destination, mode], clearRoute, { flush: 'sync' })

  async function search() {
    cancelSearch()
    origin.value = null
    const version = searchVersion
    searchController = new AbortController()
    searchLoading.value = true
    try {
      const found = await service.searchPlaces(query.value, searchController.signal)
      if (version !== searchVersion) return
      results.value = found
      searched.value = true
    } catch (error) {
      if (version === searchVersion && error.name !== 'AbortError') searchError.value = error.message
    } finally {
      if (version === searchVersion) searchLoading.value = false
    }
  }
  function selectOrigin(place) {
    origin.value = place
    results.value = []
    searched.value = false
  }
  async function planRoute() {
    clearRoute()
    const version = routeVersion
    routeController = new AbortController()
    routeLoading.value = true
    try {
      const planned = await service.getRoute(origin.value, destination.value, mode.value, routeController.signal)
      if (version === routeVersion) route.value = planned
    } catch (error) {
      if (version === routeVersion && error.name !== 'AbortError') routeError.value = error.message
    } finally {
      if (version === routeVersion) routeLoading.value = false
    }
  }
  function reset() {
    query.value = ''
    cancelSearch()
    origin.value = null
    mode.value = 'walk'
    clearRoute()
  }
  onScopeDispose(() => { cancelSearch(); clearRoute() })
  return {
    query, results, searched, origin, searchLoading, searchError, mode, route, routeLoading, routeError,
    canPlan: computed(() => Boolean(origin.value && destination.value && !routeLoading.value)),
    search, selectOrigin, planRoute, reset,
  }
}
