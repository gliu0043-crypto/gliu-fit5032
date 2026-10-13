<script setup>
import { computed, ref } from 'vue'
import { currentUser } from '../data/auth'
import { registrations, registrationsError, registrationsLoading } from '../data/events'
import { emailConfigured, readAttachment, sendActivityEmail } from '../data/email'
import { validateEmailForm } from '../../shared/email'

const recipient = ref('self')
const subject = ref('GreenMelbourne activity information')
const message = ref('Hello,\n\nPlease find the attached information for your community activity.\n\nThank you,\nGreenMelbourne Connect')
const attachment = ref(null)
const fileInput = ref(null)
const errors = ref({})
const busy = ref(false)
const feedback = ref('')
const failure = ref('')
const sent = ref(false)
let lastAttempt = null
const selectedRegistration = computed(() => registrations.value.find(row => row.id === recipient.value))
const recipientEmail = computed(() => recipient.value === 'self' ? currentUser.value?.email : selectedRegistration.value?.email)

function chooseFile(event) {
  attachment.value = event.target.files?.[0] || null
  errors.value.attachment = ''
}
function newMessage() {
  lastAttempt = null
  sent.value = false
  feedback.value = ''
  attachment.value = null
  if (fileInput.value) fileInput.value.value = ''
}
async function send() {
  if (busy.value || sent.value) return
  errors.value = validateEmailForm({ recipient: recipientEmail.value, subject: subject.value, message: message.value, attachment: attachment.value })
  feedback.value = ''
  failure.value = ''
  if (Object.keys(errors.value).length) return
  busy.value = true
  try {
    const payload = {
      recipient: recipient.value,
      subject: subject.value.trim(), message: message.value.trim(),
      attachment: await readAttachment(attachment.value),
    }
    const fingerprint = JSON.stringify(payload)
    if (lastAttempt?.fingerprint !== fingerprint) lastAttempt = { fingerprint, requestId: crypto.randomUUID() }
    const result = await sendActivityEmail({ ...payload, requestId: lastAttempt.requestId })
    feedback.value = result.status === 'simulated'
      ? `Local test passed for ${result.to}. No real email was sent.`
      : `The email service accepted your message to ${result.to}. Check the recipient inbox or spam folder for the attachment.`
    sent.value = true
  } catch (error) {
    failure.value = error.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="email-panel" aria-labelledby="email-heading">
    <h2 id="email-heading">Send activity information</h2>
    <p>Send one email with an attachment to yourself or a registered participant.</p>
    <p v-if="!emailConfigured" class="alert alert-warning" role="status">Email sending is currently unavailable. Please try again later.</p>
    <p v-if="feedback" class="alert alert-success" role="status">{{ feedback }}</p>
    <p v-if="failure" class="alert alert-danger" role="alert">{{ failure }}</p>
    <form novalidate @submit.prevent="send">
      <fieldset :disabled="busy || sent || !emailConfigured">
        <legend class="visually-hidden">Email and attachment</legend>
        <div class="row g-3">
          <div class="col-12 col-lg-6">
            <label for="email-recipient" class="form-label">Recipient</label>
            <select id="email-recipient" v-model="recipient" class="form-select" :aria-invalid="Boolean(errors.recipient)" aria-describedby="email-recipient-error">
              <option value="self">My email — {{ currentUser?.email }}</option>
              <optgroup v-if="!registrationsError && !registrationsLoading" label="Registered participants">
                <option v-for="row in registrations" :key="row.id" :value="row.id">{{ row.fullName }} — {{ row.email }} — {{ row.eventTitle }}</option>
              </optgroup>
            </select>
            <p v-if="errors.recipient" id="email-recipient-error" class="field-error">{{ errors.recipient }}</p>
          </div>
          <div class="col-12 col-lg-6">
            <label for="email-subject" class="form-label">Subject</label>
            <input id="email-subject" v-model="subject" class="form-control" maxlength="120" :aria-invalid="Boolean(errors.subject)" aria-describedby="email-subject-error">
            <p v-if="errors.subject" id="email-subject-error" class="field-error">{{ errors.subject }}</p>
          </div>
          <div class="col-12">
            <label for="email-message" class="form-label">Message</label>
            <textarea id="email-message" v-model="message" class="form-control" rows="7" maxlength="5000" :aria-invalid="Boolean(errors.message)" aria-describedby="email-message-error"></textarea>
            <p v-if="errors.message" id="email-message-error" class="field-error">{{ errors.message }}</p>
          </div>
          <div class="col-12">
            <label for="email-attachment" class="form-label">Attachment</label>
            <input id="email-attachment" ref="fileInput" class="form-control" type="file" accept=".pdf,.txt,.png,.jpg,.jpeg" :aria-invalid="Boolean(errors.attachment)" aria-describedby="email-attachment-help email-attachment-error" @change="chooseFile">
            <p id="email-attachment-help" class="form-text">One PDF, TXT, PNG or JPG file, up to 2 MB. <a href="/activity-info-example.txt" download>Download a sample attachment</a>.</p>
            <p v-if="attachment" class="form-text">Selected: {{ attachment.name }} ({{ Math.ceil(attachment.size / 1024) }} KB)</p>
            <p v-if="errors.attachment" id="email-attachment-error" class="field-error">{{ errors.attachment }}</p>
          </div>
        </div>
        <p class="recipient-summary">To: <strong>{{ recipientEmail || 'Choose a recipient' }}</strong></p>
        <button class="btn btn-success" type="submit">{{ busy ? 'Sending…' : 'Send email with attachment' }}</button>
      </fieldset>
      <button v-if="sent" class="btn btn-outline-success mt-3" type="button" @click="newMessage">Prepare another email</button>
    </form>
  </section>
</template>

<style scoped>
.email-panel { margin-top: 1.75rem; padding: 1.5rem; border: 1px solid rgba(31,41,51,.12); border-radius: 8px; background: #fff; }
h2 { color: #173f2f; font-size: 1.5rem; font-weight: 800; }
.form-label { font-weight: 700; }
.field-error { color: #b02a37; margin: .4rem 0 0; }
.recipient-summary { margin: 1.25rem 0; overflow-wrap: anywhere; }
.form-text, select { overflow-wrap: anywhere; }
fieldset { min-width: 0; }
@media(max-width: 575.98px) { .email-panel { padding: 1rem; } }
</style>
