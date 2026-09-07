<script setup>
import { computed, reactive, ref } from 'vue'
import { events, loadStoredRegistrations, saveStoredRegistrations } from '../data/events'

const registrations = ref(loadStoredRegistrations())
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

const selectedEvent = computed(() =>
  events.find((event) => event.id === Number(registrationForm.eventId)),
)

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
    formErrors.eventId = selectedEvent.value ? '' : 'Choose an activity.'
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
  saveStoredRegistrations(registrations.value)
  registrationMessage.value = `Thanks, ${registration.fullName}. Your interest in ${registration.eventTitle} has been recorded.`
  resetRegistrationForm()
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
        </div>

        <div class="col-12 col-lg-7">
          <form class="registration-form" novalidate @submit.prevent="submitRegistration">
            <h2>Register your interest</h2>

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
        <h2>Recent registrations</h2>

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
