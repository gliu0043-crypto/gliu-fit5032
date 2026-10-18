<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { currentUser } from '../data/auth'
import { events, registrations, registrationsLoading, registrationsError } from '../data/events'
import { emailConfigured, readAttachment, sendActivityEmail } from '../data/email'
import { MAX_BATCH_RECIPIENTS, validateEmailForm } from '../../shared/email'
import { focusInvalid } from '../data/accessibility'

const activity = ref(''), search = ref(''), selected = ref([])
const subject = ref('GreenMelbourne activity update')
const message = ref('Hello,\n\nPlease find the attached information for your community activity.\n\nThank you,\nGreenMelbourne Connect')
const file = ref(null), fileInput = ref(null), errors = ref({}), busy = ref(false), failure = ref('')
const draft = ref(null), attempted = ref(false), report = ref(null), reviewHeading = ref(null), resultHeading = ref(null)
const normalise = email => String(email || '').trim().toLowerCase()
const candidates = computed(() => {
  const seen = new Set(), term = search.value.trim().toLowerCase()
  return registrations.value.filter(row => {
    if (!row.email || (activity.value && row.eventId !== activity.value)) return false
    if (term && !`${row.fullName} ${row.email} ${row.eventTitle}`.toLowerCase().includes(term)) return false
    const email = normalise(row.email)
    if (seen.has(email)) return false
    seen.add(email); return true
  })
})
const chosen = computed(() => selected.value.map(id => id === 'self'
  ? { id, email: currentUser.value?.email, fullName: 'My email' }
  : registrations.value.find(row => row.id === id)).filter(Boolean))
const uniqueCount = computed(() => new Set(chosen.value.map(row => normalise(row.email))).size)
const locked = computed(() => busy.value || Boolean(draft.value))
const canResume = computed(() => attempted.value && (!report.value || report.value.results.some(row => row.status === 'not-sent')))
const completedCount = computed(() => report.value?.results.filter(row => ['accepted', 'simulated'].includes(row.status)).length || 0)
watch([activity, search], () => { if (!locked.value) selected.value = [] })
function selectVisible() { selected.value = candidates.value.slice(0, MAX_BATCH_RECIPIENTS).map(row => row.id) }
async function review(event) {
  if (locked.value) return
  errors.value = validateEmailForm({ recipient: selected.value.length ? 'batch' : '', subject: subject.value, message: message.value, attachment: file.value })
  if (selected.value.length > MAX_BATCH_RECIPIENTS || chosen.value.length !== selected.value.length) errors.value.recipient = `Choose up to ${MAX_BATCH_RECIPIENTS} current recipients.`
  failure.value = ''; report.value = null
  if (Object.keys(errors.value).length) { await focusInvalid(event.currentTarget); return }
  busy.value = true
  try {
    draft.value = {
      payload: { recipients: [...selected.value], subject: subject.value.trim(), message: message.value.trim(), attachment: await readAttachment(file.value), requestId: crypto.randomUUID() },
      addresses: [...new Set(chosen.value.map(row => normalise(row.email)))],
    }
    await nextTick(); reviewHeading.value?.focus()
  } catch { failure.value = 'The attachment could not be read. Select it again.' }
  finally { busy.value = false }
}
async function sendBatch() {
  if (busy.value || !draft.value) return
  busy.value = true; attempted.value = true; failure.value = ''
  try {
    const result = await sendActivityEmail(draft.value.payload)
    if (result.status !== 'batch-complete') throw new Error('The batch result could not be confirmed. Check the inboxes before preparing another batch.')
    report.value = result
  } catch (error) { failure.value = error.message }
  finally { busy.value = false; await nextTick(); resultHeading.value?.focus() }
}
function editBatch() {
  if (busy.value) return
  if (attempted.value && !window.confirm('Some messages may already have been sent. Check the recipient inboxes first. Prepare a NEW batch only if you intend to send new messages. Continue?')) return
  draft.value = null; attempted.value = false; report.value = null; failure.value = ''; errors.value = {}
  selected.value = []; file.value = null
  if (fileInput.value) fileInput.value.value = ''
}
function preventClose(event) { if (busy.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', preventClose)
onBeforeUnmount(() => window.removeEventListener('beforeunload', preventClose))
onBeforeRouteLeave(() => !busy.value || window.confirm('This batch may still be sending. Leaving will hide its results. Leave this page?'))
const statusLabel = status => ({ accepted: 'Accepted by email service', simulated: 'Simulated — no email sent', 'not-sent': 'Not sent', unconfirmed: 'Unconfirmed — check inbox' })[status] || status
</script>

<template>
  <section class="bulk-panel" aria-labelledby="bulk-heading" :aria-busy="busy">
    <h2 id="bulk-heading">Send a batch of activity emails</h2>
    <p>Choose up to {{ MAX_BATCH_RECIPIENTS }} recipients. Each person receives a separate email with the same attachment. Duplicate email addresses receive one message per batch.</p>
    <p v-if="!emailConfigured" class="alert alert-warning" role="status">Email sending is currently unavailable.</p>
    <p v-if="registrationsLoading" role="status">Loading recipients…</p>
    <p v-if="registrationsError" role="alert" class="alert alert-danger">{{ registrationsError }}</p>
    <form v-show="!draft" novalidate @submit.prevent="review">
      <fieldset :disabled="locked || !emailConfigured || registrationsLoading || Boolean(registrationsError)">
        <legend class="visually-hidden">Compose a batch email</legend>
        <div class="row g-3">
          <div class="col-12 col-md-6"><label for="bulk-activity" class="form-label">Filter recipients by activity</label><select id="bulk-activity" v-model="activity" class="form-select"><option value="">All activities</option><option v-for="event in events" :key="event.id" :value="event.id">{{ event.title }}</option></select></div>
          <div class="col-12 col-md-6"><label for="bulk-search" class="form-label">Find recipients</label><input id="bulk-search" v-model="search" class="form-control" type="search" placeholder="Name or email"></div>
        </div>
        <fieldset class="recipient-picker" :aria-invalid="Boolean(errors.recipient)" :aria-describedby="errors.recipient ? 'bulk-recipient-error' : 'bulk-selection-help'" tabindex="-1">
          <legend>Recipients</legend>
          <p id="bulk-selection-help">Changing the filters clears your selection. Only the selected recipients will receive the message.</p>
          <div class="bulk-actions"><button type="button" class="btn btn-outline-success btn-sm" @click="selectVisible">Select first {{ MAX_BATCH_RECIPIENTS }} matching recipients</button><button type="button" class="btn btn-outline-dark btn-sm" @click="selected = []">Clear selection</button></div>
          <label class="recipient-option"><input v-model="selected" type="checkbox" value="self" :disabled="selected.length >= MAX_BATCH_RECIPIENTS && !selected.includes('self')"> My email — {{ currentUser?.email }}</label>
          <div class="recipient-list" role="region" aria-label="Matching registered recipients" tabindex="0">
            <label v-for="row in candidates" :key="row.id" class="recipient-option"><input v-model="selected" type="checkbox" :value="row.id" :disabled="selected.length >= MAX_BATCH_RECIPIENTS && !selected.includes(row.id)"><span>{{ row.fullName }} — {{ row.email }}<small>{{ row.eventTitle }}</small></span></label>
            <p v-if="!candidates.length">No registered participants match these filters. You can still choose My email.</p>
          </div>
          <p role="status">{{ selected.length }} selections · {{ uniqueCount }} unique email addresses.</p>
          <p v-if="errors.recipient" id="bulk-recipient-error" class="field-error">{{ errors.recipient }}</p>
        </fieldset>
        <div class="mb-3"><label for="bulk-subject" class="form-label">Subject</label><input id="bulk-subject" v-model="subject" class="form-control" required maxlength="120" :aria-invalid="Boolean(errors.subject)" :aria-describedby="errors.subject ? 'bulk-subject-error' : undefined"><p v-if="errors.subject" id="bulk-subject-error" class="field-error">{{ errors.subject }}</p></div>
        <div class="mb-3"><label for="bulk-message" class="form-label">Message</label><textarea id="bulk-message" v-model="message" class="form-control" required maxlength="5000" rows="5" :aria-invalid="Boolean(errors.message)" :aria-describedby="errors.message ? 'bulk-message-error' : undefined"></textarea><p v-if="errors.message" id="bulk-message-error" class="field-error">{{ errors.message }}</p></div>
        <div class="mb-3"><label for="bulk-attachment" class="form-label">Attachment</label><input id="bulk-attachment" ref="fileInput" type="file" class="form-control" required accept=".pdf,.txt,.png,.jpg,.jpeg" :aria-invalid="Boolean(errors.attachment)" :aria-describedby="errors.attachment ? 'bulk-file-help bulk-file-error' : 'bulk-file-help'" @change="file = $event.target.files?.[0] || null"><p id="bulk-file-help" class="form-text">One PDF, TXT, PNG or JPG, up to 2 MB. <a href="/activity-info-example.txt" download>Download a sample attachment</a>.</p><p v-if="errors.attachment" id="bulk-file-error" class="field-error">{{ errors.attachment }}</p></div>
        <button type="submit" class="btn btn-success">Review batch</button>
      </fieldset>
    </form>
    <div v-if="draft" class="batch-review">
      <h3 ref="reviewHeading" tabindex="-1">Review {{ draft.addresses.length }} recipients</h3>
      <ul><li v-for="address in draft.addresses" :key="address">{{ address }}</li></ul>
      <p><strong>Subject:</strong> {{ draft.payload.subject }}</p>
      <p class="message-preview">{{ draft.payload.message }}</p>
      <p><strong>Attachment:</strong> {{ draft.payload.attachment.name }}</p>
      <p>Only each recipient's own address appears in their email. The service limit is 20 email attempts per organiser per hour, shared with single emails.</p>
      <div class="bulk-actions">
        <button v-if="!attempted" type="button" class="btn btn-success" :disabled="busy" @click="sendBatch">Confirm and send {{ draft.addresses.length }} emails</button>
        <button v-if="canResume" type="button" class="btn btn-outline-success" :disabled="busy" @click="sendBatch">Resume / check this batch</button>
        <button type="button" class="btn btn-outline-dark" :disabled="busy" @click="editBatch">{{ attempted ? 'Prepare a new batch' : 'Edit selection and message' }}</button>
      </div>
      <p v-if="canResume" class="form-text">Resume uses the same batch ID. Confirmed emails are not sent again. Unconfirmed attempts stay blocked; only recipients not yet attempted may be sent.</p>
    </div>
    <p v-if="busy" class="alert alert-info mt-3" role="status">Processing your batch. Keep this page open; this may take a few minutes.</p>
    <div v-if="failure || report" class="batch-results">
      <h3 ref="resultHeading" tabindex="-1">Batch results</h3>
      <p v-if="failure" class="alert alert-danger" role="alert">{{ failure }}</p>
      <template v-if="report">
        <p role="status">{{ completedCount }} of {{ report.results.length }} recipient requests completed. {{ report.duplicateCount }} duplicate selections removed. Check the individual results below.</p>
        <p>Accepted means the provider accepted the message; verify delivery and the attachment in the recipient inbox. Simulated results never send a real email.</p>
        <ul class="batch-result-list"><li v-for="row in report.results" :key="row.to"><strong>{{ row.to }}</strong> — {{ statusLabel(row.status) }}<p v-if="row.message">{{ row.message }}</p></li></ul>
      </template>
    </div>
  </section>
</template>
<style scoped>
.bulk-panel { margin-top: 1.75rem; padding: 1.5rem; border: 1px solid #cbd9cd; border-radius: 8px; background: #fff; }
h2 { color: #173f2f; font-size: 1.5rem; font-weight: 800; } h3, legend { color: #173f2f; font-size: 1.2rem; font-weight: 700; }
fieldset { min-width: 0; }.recipient-picker { margin: 1.2rem 0; }.recipient-list { max-height: 290px; overflow-y: auto; border: 1px solid #738176; border-radius: 6px; padding: .75rem; margin: .75rem 0; }
.recipient-option { display: flex; align-items: flex-start; gap: .65rem; padding: .65rem .2rem; overflow-wrap: anywhere; }
.recipient-option input { flex-shrink: 0; width: 1.1rem; height: 1.1rem; margin-top: .15rem; }
.recipient-option small { display: block; color: #526071; }
.bulk-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin: .75rem 0; }.batch-review, .batch-results { border-top: 1px solid #cbd9cd; padding-top: 1.25rem; margin-top: 1.25rem; overflow-wrap: anywhere; }
.field-error { color: #b02a37; }.batch-result-list li { margin: .8rem 0; }
.message-preview { white-space: pre-wrap; }
@media(max-width:575.98px) { .bulk-panel { padding: 1rem; } }
</style>
