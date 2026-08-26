<script setup>
import { computed, reactive, ref } from 'vue'

const events = [
  {
    id: 1,
    title: 'Clayton Community Tree Planting Day',
    suburb: 'Clayton',
    date: 'Saturday 29 August 2026',
    type: 'Tree planting',
    places: 18,
    description: 'A beginner-friendly planting session with tools and guidance provided.',
  },
  {
    id: 2,
    title: 'Box Hill Habitat Care Morning',
    suburb: 'Box Hill',
    date: 'Sunday 30 August 2026',
    type: 'Habitat restoration',
    places: 12,
    description: 'Help restore local habitat through mulching, weeding, and native planting.',
  },
  {
    id: 3,
    title: 'Yarra Native Garden Workshop',
    suburb: 'Yarra',
    date: 'Saturday 5 September 2026',
    type: 'Biodiversity education',
    places: 20,
    description: 'Learn simple ways to support native plants, insects, and birds at home.',
  },
]

const searchText = ref('')
const selectedType = ref('All')
const selectedSuburb = ref('All')
const registrations = ref([])
const registrationMessage = ref('')

const registrationForm = reactive({
  fullName: '',
  email: '',
  suburb: '',
  eventId: '',
  reason: '',
})

const formErrors = reactive({
  fullName: '',
  email: '',
  suburb: '',
  eventId: '',
  reason: '',
})

const activityTypes = computed(() => ['All', ...new Set(events.map((event) => event.type))])
const suburbs = computed(() => ['All', ...new Set(events.map((event) => event.suburb))])
const selectedEvent = computed(() =>
  events.find((event) => event.id === Number(registrationForm.eventId)),
)

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

const validateField = (fieldName) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (fieldName === 'fullName') {
    formErrors.fullName =
      registrationForm.fullName.trim().length >= 2 ? '' : 'Enter your full name.'
  }

  if (fieldName === 'email') {
    formErrors.email = emailPattern.test(registrationForm.email.trim())
      ? ''
      : 'Enter a valid email address.'
  }

  if (fieldName === 'suburb') {
    formErrors.suburb = registrationForm.suburb.trim() ? '' : 'Enter your suburb.'
  }

  if (fieldName === 'eventId') {
    formErrors.eventId = registrationForm.eventId ? '' : 'Choose an activity.'
  }

  if (fieldName === 'reason') {
    formErrors.reason =
      registrationForm.reason.trim().length >= 20
        ? ''
        : 'Tell us why you want to join in at least 20 characters.'
  }
}

const validateForm = () => {
  Object.keys(formErrors).forEach((fieldName) => validateField(fieldName))
  return Object.values(formErrors).every((error) => error === '')
}

const resetRegistrationForm = () => {
  registrationForm.fullName = ''
  registrationForm.email = ''
  registrationForm.suburb = ''
  registrationForm.eventId = ''
  registrationForm.reason = ''
  Object.keys(formErrors).forEach((fieldName) => {
    formErrors[fieldName] = ''
  })
}

const submitRegistration = () => {
  registrationMessage.value = ''

  if (!validateForm()) {
    return
  }

  const registration = {
    id: Date.now(),
    fullName: registrationForm.fullName.trim(),
    email: registrationForm.email.trim(),
    suburb: registrationForm.suburb.trim(),
    eventTitle: selectedEvent.value.title,
    reason: registrationForm.reason.trim(),
  }

  registrations.value.unshift(registration)
  registrationMessage.value = `Thanks, ${registration.fullName}. Your interest in ${registration.eventTitle} has been recorded.`
  resetRegistrationForm()
}
</script>

<template>
  <div class="app-shell">
    <header class="site-header">
      <nav class="container d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 py-3">
        <a class="brand-link" href="#home">GreenMelbourne Connect</a>

        <div class="nav-links d-flex flex-wrap gap-2 gap-md-3">
          <a href="#home">Home</a>
          <a href="#events">Explore Events</a>
          <a href="#join">Join Event</a>
        </div>
      </nav>
    </header>

    <main>
      <section id="home" class="hero-section">
        <div class="container">
          <div class="row align-items-center g-4">
            <div class="col-12 col-lg-7">
              <p class="eyebrow">Urban greening and biodiversity</p>
              <h1>Find local ways to make Melbourne greener.</h1>
              <p class="hero-copy">
                GreenMelbourne Connect helps residents discover tree-planting events,
                biodiversity workshops, and practical community action close to home.
              </p>
              <div class="d-flex flex-column flex-sm-row gap-3 mt-4">
                <a class="btn btn-success btn-lg" href="#events">Explore events</a>
                <a class="btn btn-outline-dark btn-lg" href="#join">Register interest</a>
              </div>
            </div>

            <div class="col-12 col-lg-5">
              <div class="impact-panel">
                <p class="panel-label">Community focus</p>
                <h2>Tree planting, habitat care, and native garden learning.</h2>
                <p>
                  Discover practical activities that help local streets, parks,
                  and gardens become healthier places for people and wildlife.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="events" class="content-section">
        <div class="container">
          <div class="section-heading">
            <p class="eyebrow">Explore Events</p>
            <h2>Upcoming community activities</h2>
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
                  <h3>{{ event.title }}</h3>
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
                </div>
              </article>
            </div>
          </div>

          <div v-else class="empty-state">
            <h3>No activities match your search.</h3>
            <p>Try changing the suburb, activity type, or search keywords.</p>
            <button class="btn btn-success" type="button" @click="clearFilters">Show all activities</button>
          </div>
        </div>
      </section>

      <section id="join" class="content-section join-section">
        <div class="container">
          <div class="row g-4 align-items-start">
            <div class="col-12 col-lg-5">
              <p class="eyebrow">Join Event</p>
              <h2>Choose an activity and get involved.</h2>
              <p>
                Community members can register interest in upcoming activities,
                check key event details, and help organisers prepare the right support.
              </p>
            </div>

            <div class="col-12 col-lg-7">
              <form class="registration-form" novalidate @submit.prevent="submitRegistration">
                <h3>Register your interest</h3>

                <div v-if="registrationMessage" class="alert alert-success" role="status">
                  {{ registrationMessage }}
                </div>

                <div class="row g-3">
                  <div class="col-12 col-md-6">
                    <label class="form-label" for="full-name">Full name</label>
                    <input
                      id="full-name"
                      v-model="registrationForm.fullName"
                      class="form-control"
                      :class="{ 'is-invalid': formErrors.fullName }"
                      type="text"
                      autocomplete="name"
                      @input="validateField('fullName')"
                      @blur="validateField('fullName')"
                    >
                    <div v-if="formErrors.fullName" class="invalid-feedback">
                      {{ formErrors.fullName }}
                    </div>
                  </div>

                  <div class="col-12 col-md-6">
                    <label class="form-label" for="email">Email</label>
                    <input
                      id="email"
                      v-model="registrationForm.email"
                      class="form-control"
                      :class="{ 'is-invalid': formErrors.email }"
                      type="email"
                      autocomplete="email"
                      @input="validateField('email')"
                      @blur="validateField('email')"
                    >
                    <div v-if="formErrors.email" class="invalid-feedback">
                      {{ formErrors.email }}
                    </div>
                  </div>

                  <div class="col-12 col-md-6">
                    <label class="form-label" for="suburb">Suburb</label>
                    <input
                      id="suburb"
                      v-model="registrationForm.suburb"
                      class="form-control"
                      :class="{ 'is-invalid': formErrors.suburb }"
                      type="text"
                      autocomplete="address-level2"
                      @input="validateField('suburb')"
                      @blur="validateField('suburb')"
                    >
                    <div v-if="formErrors.suburb" class="invalid-feedback">
                      {{ formErrors.suburb }}
                    </div>
                  </div>

                  <div class="col-12 col-md-6">
                    <label class="form-label" for="event-choice">Activity</label>
                    <select
                      id="event-choice"
                      v-model="registrationForm.eventId"
                      class="form-select"
                      :class="{ 'is-invalid': formErrors.eventId }"
                      @blur="validateField('eventId')"
                      @change="validateField('eventId')"
                    >
                      <option value="">Select an activity</option>
                      <option v-for="event in events" :key="event.id" :value="event.id">
                        {{ event.title }}
                      </option>
                    </select>
                    <div v-if="formErrors.eventId" class="invalid-feedback">
                      {{ formErrors.eventId }}
                    </div>
                  </div>

                  <div class="col-12">
                    <label class="form-label" for="reason">Reason for joining</label>
                    <textarea
                      id="reason"
                      v-model="registrationForm.reason"
                      class="form-control"
                      :class="{ 'is-invalid': formErrors.reason }"
                      rows="4"
                      @input="validateField('reason')"
                      @blur="validateField('reason')"
                    ></textarea>
                    <div class="form-hint">
                      {{ registrationForm.reason.trim().length }}/20 characters minimum
                    </div>
                    <div v-if="formErrors.reason" class="invalid-feedback">
                      {{ formErrors.reason }}
                    </div>
                  </div>
                </div>

                <div class="d-flex flex-column flex-sm-row gap-3 mt-4">
                  <button class="btn btn-success btn-lg" type="submit">Submit registration</button>
                  <button class="btn btn-outline-dark btn-lg" type="button" @click="resetRegistrationForm">
                    Clear form
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div v-if="registrations.length > 0" class="registrations-panel">
            <h3>Recent registrations</h3>

            <div class="row g-3">
              <div v-for="registration in registrations" :key="registration.id" class="col-12 col-lg-6">
                <article class="registration-card">
                  <h4>{{ registration.eventTitle }}</h4>
                  <p>
                    {{ registration.fullName }} from {{ registration.suburb }} registered interest
                    in this activity.
                  </p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container py-4">
        <p>GreenMelbourne Connect - Local climate action through urban greening.</p>
      </div>
    </footer>
  </div>
</template>
