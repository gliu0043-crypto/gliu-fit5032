<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { events, eventsLoading, eventsError, registrations, registrationsLoading, registrationsError, addRegistration } from '../data/events'
import { currentUser } from '../data/auth'
import { cleanEmail, cleanLongText, cleanText } from '../data/security'

const route = useRoute()
const submitting = ref(false)
const registrationError = ref('')
const registrationMessage = ref('')
const activitySearch = ref('')

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

const selectedEvent = computed(() =>
  events.find((event) => event.id === String(registrationForm.eventId)),
)

const activitySearchResults = computed(() => {
  const search = activitySearch.value.trim().toLowerCase()

  if (!search) {
    return events
  }

  return events.filter((event) => {
    const searchableText = `${event.title} ${event.suburb} ${event.type} ${event.description}`.toLowerCase()
    return searchableText.includes(search)
  })
})

const chooseActivity = (event) => {
  registrationForm.eventId = String(event.id)
  formErrors.eventId = ''
  registrationMessage.value = ''
}

const chooseActivityFromRoute = () => {
  const eventFromRoute = events.find((event) => event.id === String(route.query.activityId))

  if (eventFromRoute) {
    chooseActivity(eventFromRoute)
  }
}

chooseActivityFromRoute()

watch(
  () => [route.query.activityId, events.length],
  () => {
    chooseActivityFromRoute()
  },
)

const validateField = (fieldName) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (fieldName === 'fullName') {
    formErrors.fullName =
      cleanText(registrationForm.fullName).length >= 2 ? '' : 'Enter your full name.'
  }

  if (fieldName === 'email') {
    formErrors.email = emailPattern.test(cleanEmail(registrationForm.email))
      ? ''
      : 'Enter a valid email address.'
  }

  if (fieldName === 'suburb') {
    formErrors.suburb = cleanText(registrationForm.suburb) ? '' : 'Enter your suburb.'
  }

  if (fieldName === 'eventId') {
    formErrors.eventId = selectedEvent.value ? '' : 'Choose an activity.'
  }

  if (fieldName === 'reason') {
    formErrors.reason =
      cleanLongText(registrationForm.reason).length >= 20
        ? ''
        : 'Tell us why you want to join in at least 20 characters.'
  }
}

const validateForm = () => {
  Object.keys(formErrors).forEach((fieldName) => validateField(fieldName))
  return Object.values(formErrors).every((error) => error === '')
}

const resetRegistrationForm = () => {
  registrationForm.fullName = currentUser.value?.fullName || ''
  registrationForm.email = currentUser.value?.email || ''
  registrationForm.suburb = ''
  registrationForm.eventId = ''
  registrationForm.reason = ''
  Object.keys(formErrors).forEach((fieldName) => {
    formErrors[fieldName] = ''
  })
}

watch(currentUser, (user) => {
  registrationForm.fullName = user?.fullName || ''
  registrationForm.email = user?.email || ''
}, { immediate: true })

const submitRegistration = async () => {
  if (submitting.value) return
  registrationMessage.value = ''
  registrationError.value = ''
  if (!currentUser.value) { registrationError.value = 'Please sign in to register.'; return }
  if (!validateForm()) return
  const registration = {
    eventId: selectedEvent.value.id,
    fullName: cleanText(registrationForm.fullName),
    suburb: cleanText(registrationForm.suburb),
    reason: cleanLongText(registrationForm.reason),
  }
  submitting.value = true
  try {
    await addRegistration(registration)
    registrationMessage.value = `Thanks, ${registration.fullName}. Your interest has been saved.`
    resetRegistrationForm()
    registrationForm.fullName = currentUser.value?.fullName || ''
    registrationForm.email = currentUser.value?.email || ''
  } catch {
    registrationError.value = 'Your registration could not be saved. Check your connection and try again.'
  } finally { submitting.value = false }
}
</script>

<template>
  <section class="content-section page-section join-section">
    <div class="container">
      <div class="row g-4 align-items-start">
        <div class="col-12 col-lg-5">
          <p class="eyebrow">Join Event</p>
          <h1>Choose an activity and get involved.</h1>
          <p>
            Community members can register interest in upcoming activities,
            check key event details, and help organisers prepare the right support.
          </p>

          <div class="activity-picker">
            <h2>Find an activity</h2>
            <p v-if="eventsLoading" role="status">Loading activities…</p>
            <p v-if="eventsError" class="alert alert-danger" role="alert">{{ eventsError }}</p>

            <label class="form-label" for="activity-search">Search activity</label>
            <input
              id="activity-search"
              v-model="activitySearch"
              class="form-control"
              type="search"
              placeholder="Search by title, suburb, or type"
            >

            <p class="form-hint">{{ activitySearchResults.length }} activities available</p>

            <div v-if="activitySearchResults.length > 0" class="activity-choice-list">
              <article
                v-for="event in activitySearchResults"
                :key="event.id"
                class="activity-choice-card"
                :class="{ selected: selectedEvent && selectedEvent.id === event.id }"
              >
                <span class="event-type">{{ event.type }}</span>
                <h3>{{ event.title }}</h3>
                <p>{{ event.suburb }} - {{ event.date }}</p>

                <div class="event-card-actions">
                  <RouterLink
                    class="btn btn-outline-dark btn-sm"
                    :to="{ name: 'activity-detail', params: { id: event.id } }"
                  >
                    View details
                  </RouterLink>
                  <button class="btn btn-success btn-sm" type="button" @click="chooseActivity(event)">
                    Select activity
                  </button>
                </div>
              </article>
            </div>

            <div v-else-if="!eventsLoading && !eventsError" class="empty-state compact-empty-state">
              <h3>No activities found.</h3>
              <p>Try another suburb, title, or activity type.</p>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-7 join-form-column">
          <form class="registration-form" novalidate @submit.prevent="submitRegistration">
            <h2>Register your interest</h2>
            <p v-if="!currentUser" class="alert alert-info"><RouterLink to="/auth">Sign in or create an account</RouterLink> to register for an activity.</p>
            <p v-if="registrationError" class="alert alert-danger" role="alert">{{ registrationError }}</p>

            <div v-if="registrationMessage" class="alert alert-success" role="status">
              {{ registrationMessage }}
            </div>

            <div class="row g-3">
              <div class="col-12">
                <div
                  class="selected-activity"
                  :class="{ 'selection-missing': formErrors.eventId }"
                >
                  <p class="panel-label">Selected activity</p>
                  <template v-if="selectedEvent">
                    <h3>{{ selectedEvent.title }}</h3>
                    <p>{{ selectedEvent.suburb }} - {{ selectedEvent.date }}</p>
                  </template>
                  <p v-else>Search and select an activity before submitting.</p>
                </div>
                <div v-if="formErrors.eventId" class="selection-error">
                  {{ formErrors.eventId }}
                </div>
              </div>

              <div class="col-12 col-md-6">
                <label class="form-label" for="full-name">Full name</label>
                <input
                  id="full-name"
                  v-model="registrationForm.fullName"
                  class="form-control"
                  maxlength="100"
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
                  readonly
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
                  maxlength="100"
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

              <div class="col-12">
                <label class="form-label" for="reason">Reason for joining</label>
                <textarea
                  id="reason"
                  v-model="registrationForm.reason"
                  maxlength="2000"
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
              <button class="btn btn-success btn-lg" type="submit" :disabled="submitting || !currentUser || !selectedEvent">{{ submitting ? 'Saving…' : 'Submit registration' }}</button>
              <button class="btn btn-outline-dark btn-lg" type="button" :disabled="submitting" @click="resetRegistrationForm">
                Clear form
              </button>
            </div>
          </form>
        </div>
      </div>

      <p v-if="registrationsLoading" role="status">Loading registrations…</p>
      <p v-if="registrationsError" class="alert alert-danger" role="alert">{{ registrationsError }}</p>
      <div v-if="registrations.length > 0" class="registrations-panel">
        <h2>{{ currentUser?.role === 'organiser' ? 'Recent registrations' : 'Your registrations' }}</h2>

        <div class="row g-3">
          <div v-for="registration in registrations" :key="registration.id" class="col-12 col-lg-6">
            <article class="registration-card">
              <h3>{{ registration.eventTitle }}</h3>
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
</template>
