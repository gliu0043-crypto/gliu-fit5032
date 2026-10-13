<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import InteractiveTable from '../components/InteractiveTable.vue'
import EmailComposer from '../components/EmailComposer.vue'
import { currentUser, roleLabels } from '../data/auth'
import {
  events, eventsLoading, eventsError,
  registrations, registrationsLoading, registrationsError,
  setRegistrationStatus, removeRegistration,
} from '../data/events'
import { activityColumns, registrationColumns } from '../data/tableColumns'
import { safeRegistrationStatus } from '../data/security'

const actionError = ref('')
const actionMessage = ref('')
const pendingId = ref(null)
const isOrganiser = computed(() => currentUser.value?.role === 'organiser')
const waitingCount = computed(() => registrations.value.filter((registration) => registration.status !== 'Contacted').length)
const contactedCount = computed(() => registrations.value.filter((registration) => registration.status === 'Contacted').length)

async function updateRegistrationStatus(registration, event) {
  if (!isOrganiser.value || pendingId.value) return
  const select = event.target
  const status = safeRegistrationStatus(select.value)
  const previousStatus = registration.status || 'Waiting'
  if (status === previousStatus) return
  actionError.value = ''
  actionMessage.value = ''
  pendingId.value = registration.id
  try {
    await setRegistrationStatus(registration.id, status)
    actionMessage.value = `Status saved for ${registration.fullName}: ${status}.`
  } catch {
    select.value = previousStatus
    actionError.value = 'The status could not be saved. Please try again.'
  } finally {
    pendingId.value = null
  }
}

async function deleteRegistration(registration) {
  if (!isOrganiser.value || pendingId.value) return
  if (!window.confirm(`Delete the registration from ${registration.fullName} for ${registration.eventTitle}? This cannot be undone.`)) return
  actionError.value = ''
  actionMessage.value = ''
  pendingId.value = registration.id
  try {
    await removeRegistration(registration.id)
    actionMessage.value = `Registration from ${registration.fullName} deleted.`
  } catch {
    actionError.value = 'The registration could not be deleted. Please try again.'
  } finally {
    pendingId.value = null
  }
}
</script>

<template>
  <section class="content-section page-section organiser-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">Organiser Area</p>
        <h1>Activities and registrations.</h1>
        <p>Find an activity, review registrations and keep track of follow-up with community members.</p>
      </div>

      <div v-if="!currentUser" class="access-message">
        <h2>Login required</h2>
        <p>Please login with an organiser account to manage event registrations.</p>
        <RouterLink class="btn btn-success btn-lg" to="/auth">Go to member access</RouterLink>
      </div>
      <div v-else-if="!isOrganiser" class="access-message">
        <h2>Member account</h2>
        <p>{{ currentUser.fullName }} is signed in as {{ roleLabels[currentUser.role] }}. This area is only available to organisers.</p>
        <RouterLink class="btn btn-success btn-lg" to="/join">Browse activities</RouterLink>
      </div>

      <template v-else>
        <div class="organiser-summary-grid">
          <article class="summary-card">
            <p class="panel-label">Total registrations</p>
            <strong>{{ registrationsLoading || registrationsError ? '—' : registrations.length }}</strong>
          </article>
          <article class="summary-card">
            <p class="panel-label">Waiting</p>
            <strong>{{ registrationsLoading || registrationsError ? '—' : waitingCount }}</strong>
          </article>
          <article class="summary-card">
            <p class="panel-label">Contacted</p>
            <strong>{{ registrationsLoading || registrationsError ? '—' : contactedCount }}</strong>
          </article>
        </div>

        <InteractiveTable id="activities" title="Activities" :rows="events" :columns="activityColumns"
          :initial-sort="{ key: 'date', direction: 'asc' }" :loading="eventsLoading" :error="eventsError"
          description="Browse scheduled activities, locations and available places."
          empty-message="No activities have been published yet.">
          <template #cell-title="{ row }">
            <RouterLink class="table-activity-link" :to="{ name: 'activity-detail', params: { id: row.id } }">{{ row.title }}</RouterLink>
          </template>
        </InteractiveTable>

        <div class="registration-feedback">
          <p v-if="actionError" class="alert alert-danger" role="alert">{{ actionError }}</p>
          <p v-if="actionMessage" class="alert alert-success" role="status">{{ actionMessage }}</p>
        </div>
        <InteractiveTable id="registrations" title="Registrations" :rows="registrations" :columns="registrationColumns"
          :initial-sort="{ key: 'createdAt', direction: 'desc' }" :loading="registrationsLoading" :error="registrationsError"
          description="Search member details and update the follow-up status of each registration."
          empty-message="No registrations yet. New interest forms will appear here after members submit them.">
          <template #cell-fullName="{ value }"><strong>{{ value }}</strong></template>
          <template #cell-eventTitle="{ row }">
            <strong>{{ row.eventTitle }}</strong>
            <span class="registration-reason">{{ row.reason }}</span>
          </template>
          <template #cell-email="{ value }"><span class="registration-email">{{ value }}</span></template>
          <template #cell-status="{ row }">
            <select class="form-select form-select-sm registration-status" :value="row.status || 'Waiting'"
              :disabled="pendingId !== null" :aria-label="`Follow-up status for ${row.fullName}, ${row.eventTitle}`"
              @change="updateRegistrationStatus(row, $event)">
              <option value="Waiting">Waiting</option>
              <option value="Contacted">Contacted</option>
            </select>
          </template>
          <template #cell-actions="{ row }">
            <button class="btn btn-outline-danger btn-sm" type="button" :disabled="pendingId !== null"
              :aria-label="`Delete registration from ${row.fullName} for ${row.eventTitle}`" @click="deleteRegistration(row)">
              {{ pendingId === row.id ? 'Saving…' : 'Delete' }}
            </button>
          </template>
        </InteractiveTable>
        <EmailComposer />
      </template>
    </div>
  </section>
</template>

<style scoped>
.table-activity-link { color: #216e4e; font-weight: 750; text-underline-offset: 3px; }
.registration-reason { display: block; color: #5d6675; font-size: .85rem; margin-top: .4rem; min-width: 180px; }
.registration-email { overflow-wrap: anywhere; }
.registration-status { min-width: 135px; }
.registration-feedback:not(:empty) { margin-top: 1.75rem; }
.registration-feedback p { margin-bottom: 0; }
</style>
