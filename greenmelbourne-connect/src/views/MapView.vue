<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ActivityMap from '../components/ActivityMap.vue'
import { events, eventsError, eventsLoading } from '../data/events'
import { getActivityLocation } from '../data/activityLocations'
import { createMapService, formatDistance, formatDuration, travelModes } from '../data/mapService'
import { useTripPlanner } from '../composables/useTripPlanner'

const pageRoute = useRoute()
const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || ''
const activityId = ref('')
const mappedActivities = computed(() => events.map((activity) => ({ ...activity, location: getActivityLocation(activity) }))
  .filter((activity) => activity.location).sort((a, b) => a.title.localeCompare(b.title)))
const selectedActivity = computed(() => mappedActivities.value.find((activity) => activity.id === activityId.value))
const destination = computed(() => selectedActivity.value?.location || null)
watch(() => pageRoute.query.activityId, (value) => { activityId.value = typeof value === 'string' ? value : '' }, { immediate: true })

const {
  query, results, searched, origin, searchLoading, searchError, mode, route, routeLoading, routeError,
  canPlan, search, selectOrigin, planRoute, reset,
} = useTripPlanner(createMapService(apiKey), destination)
function resetTrip() { reset(); activityId.value = '' }
</script>

<template>
  <section class="content-section page-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Plan your visit</p>
        <h1>Find an activity and plan your trip</h1>
        <p>Search Melbourne places, choose an activity, and find a walking or cycling route.</p>
      </div>
      <p class="alert alert-info">Coursework demo: activities and sample meeting points are fictional. These are not confirmed event venues.</p>
      <p v-if="!apiKey" class="alert alert-warning" role="status">Map services are being set up. Please try again later.</p>
      <p v-if="eventsLoading" role="status">Loading activities…</p>
      <p v-if="eventsError" class="alert alert-danger" role="alert">{{ eventsError }}</p>

      <div class="row g-4 align-items-start">
        <div class="col-12 col-lg-4">
          <div class="trip-panel">
            <form novalidate @submit.prevent="search">
              <h2>1. Find your starting point</h2>
              <label for="place-search" class="form-label">Place, suburb or address</label>
              <div class="d-flex gap-2">
                <input id="place-search" v-model="query" class="form-control" type="search" maxlength="120"
                  placeholder="e.g. Clayton" aria-describedby="place-search-help" :disabled="!apiKey">
                <button class="btn btn-success" :disabled="!apiKey || searchLoading" type="submit">{{ searchLoading ? 'Searching…' : 'Search' }}</button>
              </div>
              <p id="place-search-help" class="form-hint mt-2">Search is limited to the Melbourne area. Choose a result to set your start.</p>
              <p v-if="searchError" class="alert alert-danger" role="alert">{{ searchError }}</p>
              <p v-if="searchLoading" role="status">Searching Melbourne places…</p>
              <p v-else-if="searched && !results.length" role="status">No places found. Try a nearby suburb or a more specific address.</p>
              <ul v-if="results.length" class="place-results" aria-label="Place search results">
                <li v-for="place in results" :key="place.id">
                  <button type="button" @click="selectOrigin(place)">{{ place.label }}<span>Use as starting point</span></button>
                </li>
              </ul>
              <div v-if="origin" class="trip-start" role="status"><strong>Starting point</strong><p>{{ origin.label }}</p></div>
            </form>

            <div class="trip-step">
              <h2>2. Choose an activity</h2>
              <label for="map-activity" class="form-label">Activity destination</label>
              <select id="map-activity" v-model="activityId" class="form-select" :disabled="eventsLoading || !mappedActivities.length">
                <option value="">Select an activity</option>
                <option v-for="activity in mappedActivities" :key="activity.id" :value="activity.id">{{ activity.title }}</option>
              </select>
              <p class="form-hint mt-2">{{ mappedActivities.length }} activities with sample map locations.</p>
              <div v-if="selectedActivity" class="trip-destination">
                <strong>{{ selectedActivity.title }}</strong>
                <p>{{ selectedActivity.date }}</p>
                <p>{{ destination.label }} (approximate)</p>
                <RouterLink :to="{ name: 'activity-detail', params: { id: selectedActivity.id } }">View activity details</RouterLink>
              </div>
            </div>

            <form class="trip-step" @submit.prevent="planRoute">
              <h2>3. Plan your route</h2>
              <label for="travel-mode" class="form-label">Travel mode</label>
              <select id="travel-mode" v-model="mode" class="form-select mb-3">
                <option v-for="item in travelModes" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
              <button class="btn btn-success w-100" type="submit" :disabled="!apiKey || !canPlan">{{ routeLoading ? 'Planning route…' : 'Plan route' }}</button>
              <p v-if="!origin || !destination" class="form-hint mt-2">Choose a starting point and an activity to plan a route.</p>
              <p v-if="routeLoading" class="mt-2" role="status">Calculating your route…</p>
              <p v-if="routeError" class="alert alert-danger mt-3" role="alert">{{ routeError }}</p>
            </form>
            <button class="btn btn-outline-dark w-100 mt-3" type="button" @click="resetTrip">Clear trip</button>
          </div>
        </div>

        <div class="col-12 col-lg-8 map-column">
          <ActivityMap v-if="apiKey" :api-key="apiKey" :activities="mappedActivities" :selected-id="activityId"
            :origin="origin" :route="route" @select="activityId = $event" />
          <div v-else class="map-placeholder">The activity map will appear here when setup is complete.</div>
          <div v-if="route" class="trip-summary mt-3" role="status">
            <h2>{{ mode === 'walk' ? 'Walking' : 'Cycling' }} route</h2>
            <div class="trip-metrics"><strong>{{ formatDistance(route.distance) }}</strong><strong>{{ formatDuration(route.duration) }}</strong></div>
            <p>{{ origin.label }} → {{ destination.label }}</p>
            <p class="form-hint mb-0">Estimated travel time. Routes follow mapped roads and paths; conditions and access may vary.</p>
          </div>
          <p class="form-hint mt-3">Search text and route coordinates are sent to Geoapify to calculate your trip. Your trip is not saved to your account.</p>
        </div>
      </div>
    </div>
  </section>
</template>
