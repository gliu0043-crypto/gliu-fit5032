<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { currentUser, roleLabels } from '../data/auth'
import { loadStoredRegistrations, saveStoredRegistrations } from '../data/events'

const registrations = ref(loadStoredRegistrations())

const isOrganiser = computed(() => currentUser.value?.role === 'organiser')

const waitingCount = computed(
  () => registrations.value.filter((registration) => registration.status !== 'Contacted').length,
)

const contactedCount = computed(
  () => registrations.value.filter((registration) => registration.status === 'Contacted').length,
)

const saveRegistrations = () => {
  saveStoredRegistrations(registrations.value)
}

const updateRegistrationStatus = (registration, status) => {
  registration.status = status
  saveRegistrations()
}

const deleteRegistration = (registrationId) => {
  registrations.value = registrations.value.filter((registration) => registration.id !== registrationId)
  saveRegistrations()
}
</script>

<template>
  <section class="content-section page-section organiser-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Organiser Area</p>
        <h1>Manage event registrations.</h1>
        <p>
          Organiser accounts can review submitted interest forms and update registration follow-up.
        </p>
      </div>

      <div v-if="!currentUser" class="access-message">
        <h2>Login required</h2>
        <p>Please login with an organiser account to manage event registrations.</p>
        <RouterLink class="btn btn-success btn-lg" to="/auth">Go to member access</RouterLink>
      </div>

      <div v-else-if="!isOrganiser" class="access-message">
        <h2>Member account</h2>
        <p>
          {{ currentUser.fullName }} is signed in as
          {{ roleLabels[currentUser.role] }}. This area is only available to organisers.
        </p>
        <RouterLink class="btn btn-success btn-lg" to="/join">Browse activities</RouterLink>
      </div>

      <template v-else>
        <div class="organiser-summary-grid">
          <article class="summary-card">
            <p class="panel-label">Total registrations</p>
            <strong>{{ registrations.length }}</strong>
          </article>
          <article class="summary-card">
            <p class="panel-label">Waiting</p>
            <strong>{{ waitingCount }}</strong>
          </article>
          <article class="summary-card">
            <p class="panel-label">Contacted</p>
            <strong>{{ contactedCount }}</strong>
          </article>
        </div>

        <div v-if="registrations.length === 0" class="empty-state">
          <h3>No registrations yet.</h3>
          <p>New event interest forms will appear here after community members submit them.</p>
          <RouterLink class="btn btn-outline-dark" to="/join">Open join form</RouterLink>
        </div>

        <div v-else class="organiser-table-card">
          <div class="table-responsive">
            <table class="table registration-table align-middle">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Activity</th>
                  <th scope="col">Suburb</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="registration in registrations" :key="registration.id">
                  <td>
                    <strong>{{ registration.fullName }}</strong>
                    <span>{{ registration.email }}</span>
                  </td>
                  <td>
                    <strong>{{ registration.eventTitle }}</strong>
                    <span>{{ registration.reason }}</span>
                  </td>
                  <td>{{ registration.suburb }}</td>
                  <td>
                    <select
                      class="form-select form-select-sm"
                      :value="registration.status || 'Waiting'"
                      @change="updateRegistrationStatus(registration, $event.target.value)"
                    >
                      <option value="Waiting">Waiting</option>
                      <option value="Contacted">Contacted</option>
                    </select>
                  </td>
                  <td>
                    <button
                      class="btn btn-outline-danger btn-sm"
                      type="button"
                      @click="deleteRegistration(registration.id)"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
