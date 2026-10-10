import { reactive, ref, watch } from 'vue'
import { collection, doc, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db, requireDatabase } from '../firebase/init'
import { currentUser } from './auth'

export const events = reactive([])
export const eventsLoading = ref(Boolean(db))
export const eventsError = ref(db ? '' : 'Activities are currently unavailable. Please try again later.')
export const registrations = ref([])
export const registrationsLoading = ref(false)
export const registrationsError = ref('')
if (db) onSnapshot(collection(db, 'gmcEvents'), (snapshot) => {
  events.splice(0, events.length, ...snapshot.docs.map((item) => ({ ...item.data(), id: item.id })))
  eventsLoading.value = false
  eventsError.value = ''
}, () => {
  eventsLoading.value = false
  eventsError.value = 'Activities could not be loaded. Please check your connection and reload.'
})
let stopRegistrations = () => {}
watch(() => [currentUser.value?.id, currentUser.value?.role], () => {
  stopRegistrations()
  registrations.value = []
  registrationsError.value = ''
  registrationsLoading.value = false
  const user = currentUser.value
  if (!user || !db) return
  registrationsLoading.value = true
  const source = collection(db, 'gmcRegistrations')
  const selection = user.role === 'organiser' ? source : query(source, where('userId', '==', user.id))
  stopRegistrations = onSnapshot(selection, (snapshot) => {
    registrations.value = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    registrationsLoading.value = false
  }, () => {
    registrations.value = []
    registrationsLoading.value = false
    registrationsError.value = 'Registrations could not be loaded. Please sign in again or retry later.'
  })
}, { immediate: true })
export async function addRegistration(registration) {
  const user = currentUser.value
  if (!user) throw new Error('Please sign in to register for an activity.')
  const event = events.find((item) => item.id === registration.eventId)
  if (!event) throw new Error('Please select an available activity.')
  await addDoc(collection(requireDatabase(), 'gmcRegistrations'), {
    ...registration, email: user.email, userId: user.id,
    eventTitle: event.title, status: 'Waiting', createdAt: serverTimestamp(),
  })
}
export async function setRegistrationStatus(id, status) {
  await updateDoc(doc(requireDatabase(), 'gmcRegistrations', id), { status })
}
export async function removeRegistration(id) {
  await deleteDoc(doc(requireDatabase(), 'gmcRegistrations', id))
}
