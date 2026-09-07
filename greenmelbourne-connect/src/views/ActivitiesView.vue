<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { events } from '../data/events'

const searchText = ref('')
const selectedType = ref('All')
const selectedSuburb = ref('All')

const activityTypes = computed(() => ['All', ...new Set(events.map((event) => event.type))])
const suburbs = computed(() => ['All', ...new Set(events.map((event) => event.suburb))])

const filteredEvents = computed(() => {
  const search = searchText.value.trim().toLowerCase()

  return events.filter((event) => {
    const searchableText = `${event.title} ${event.suburb} ${event.type} ${event.description}`.toLowerCase()
    const matchesSearch = searchableText.includes(search)
    const matchesType = selectedType.value === 'All' || event.type === selectedType.value
    const matchesSuburb = selectedSuburb.value === 'All' || event.suburb === selectedSuburb.value

    return matchesSearch && matchesType && matchesSuburb
  })
})

const resultSummary = computed(() => {
  const count = filteredEvents.value.length
  return `${count} ${count === 1 ? 'activity' : 'activities'} found`
})

const hasActiveFilters = computed(
  () => searchText.value.trim() !== '' || selectedType.value !== 'All' || selectedSuburb.value !== 'All',
)

const clearFilters = () => {
  searchText.value = ''
  selectedType.value = 'All'
  selectedSuburb.value = 'All'
}
</script>

<template>
  <section class="content-section page-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Explore Events</p>
        <h1>Upcoming community activities</h1>
        <p>
          Browse local planting days, habitat care sessions, and learning
          workshops designed for different experience levels.
        </p>
      </div>

      <form class="filter-panel" @submit.prevent>
        <div class="row g-3 align-items-end">
          <div class="col-12 col-lg-5">
            <label class="form-label" for="event-search">Search activities</label>
            <input
              id="event-search"
              v-model="searchText"
              class="form-control form-control-lg"
              type="search"
              placeholder="Search by suburb, title, or activity"
            >
          </div>

          <div class="col-12 col-sm-6 col-lg-3">
            <label class="form-label" for="activity-type">Activity type</label>
            <select id="activity-type" v-model="selectedType" class="form-select form-select-lg">
              <option v-for="type in activityTypes" :key="type" :value="type">
                {{ type === 'All' ? 'All activities' : type }}
              </option>
            </select>
          </div>

          <div class="col-12 col-sm-6 col-lg-2">
            <label class="form-label" for="activity-suburb">Suburb</label>
            <select id="activity-suburb" v-model="selectedSuburb" class="form-select form-select-lg">
              <option v-for="suburb in suburbs" :key="suburb" :value="suburb">
                {{ suburb === 'All' ? 'All suburbs' : suburb }}
              </option>
            </select>
          </div>

          <div class="col-12 col-lg-2">
            <button
              class="btn btn-outline-success btn-lg w-100"
              type="button"
              :disabled="!hasActiveFilters"
              @click="clearFilters"
            >
              Clear
            </button>
          </div>
        </div>
      </form>

      <div class="results-bar">
        <p>{{ resultSummary }}</p>
      </div>

      <div v-if="filteredEvents.length > 0" class="row g-4">
        <div v-for="event in filteredEvents" :key="event.id" class="col-12 col-md-6 col-xl-4">
          <article class="event-card h-100">
            <div class="event-card-body">
              <span class="event-type">{{ event.type }}</span>
              <h2>{{ event.title }}</h2>
              <dl class="event-details">
                <div>
                  <dt>Suburb</dt>
                  <dd>{{ event.suburb }}</dd>
                </div>
                <div>
                  <dt>Date</dt>
                  <dd>{{ event.date }}</dd>
                </div>
                <div>
                  <dt>Places</dt>
                  <dd>{{ event.places }} available</dd>
                </div>
              </dl>
              <p>{{ event.description }}</p>
              <div class="event-card-actions">
                <RouterLink
                  class="btn btn-success"
                  :to="{ name: 'activity-detail', params: { id: event.id } }"
                >
                  View details
                </RouterLink>
                <RouterLink class="btn btn-outline-dark" to="/join">Register interest</RouterLink>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div v-else class="empty-state">
        <h2>No activities match your search.</h2>
        <p>Try changing the suburb, activity type, or search keywords.</p>
        <button class="btn btn-success" type="button" @click="clearFilters">Show all activities</button>
      </div>
    </div>
  </section>
</template>
