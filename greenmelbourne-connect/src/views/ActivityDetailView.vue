<script setup>
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { events } from '../data/events'

const route = useRoute()
const event = computed(() => events.find((activity) => activity.id === Number(route.params.id)))
</script>

<template>
  <section class="content-section page-section">
    <div class="container">
      <div v-if="event" class="row g-4 align-items-start">
        <div class="col-12 col-lg-7">
          <p class="eyebrow">{{ event.type }}</p>
          <h1>{{ event.title }}</h1>
          <p class="hero-copy">{{ event.description }}</p>

          <div class="d-flex flex-column flex-sm-row gap-3 mt-4">
            <RouterLink
              class="btn btn-success btn-lg"
              :to="{ name: 'join', query: { activityId: event.id } }"
            >
              Register interest
            </RouterLink>
            <RouterLink class="btn btn-outline-dark btn-lg" to="/activities">Back to activities</RouterLink>
          </div>
        </div>

        <div class="col-12 col-lg-5">
          <div class="impact-panel">
            <p class="panel-label">Activity details</p>
            <dl class="event-details detail-list">
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
              <div>
                <dt>Activity type</dt>
                <dd>{{ event.type }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <h1>Activity not found.</h1>
        <p>The selected activity could not be found in the current activity list.</p>
        <RouterLink class="btn btn-success" to="/activities">View all activities</RouterLink>
      </div>
    </div>
  </section>
</template>
