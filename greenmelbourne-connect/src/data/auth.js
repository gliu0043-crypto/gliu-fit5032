import { ref } from 'vue'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from 'firebase/auth'
import { doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/init'
import { cleanEmail, cleanText } from './security'

export const roleLabels = { member: 'Community member', organiser: 'Organiser' }
export const currentUser = ref(null)
export const authLoading = ref(true)
export const authError = ref('')
export const authBusy = ref(false)
let resolveReady
export const authReady = new Promise((resolve) => { resolveReady = resolve })
let stopProfile = () => {}
let generation = 0
const ready = () => { authLoading.value = false; resolveReady() }

export function authErrorMessage(error) {
  const messages = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Unable to connect. Check your connection and try again.',
    'auth/operation-not-allowed': 'Account access is temporarily unavailable. Please try again later.',
  }
  return messages[error?.code] || 'The request could not be completed. Please check your connection and try again.'
}
async function ensureProfile(user) {
  const reference = doc(db, 'gmcUsers', user.uid)
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists()) transaction.set(reference, {
      fullName: cleanText(user.displayName || user.email.split('@')[0]),
      email: user.email, role: 'member', createdAt: serverTimestamp(),
    })
  })
  return reference
}
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    const version = ++generation
    stopProfile()
    currentUser.value = null
    authLoading.value = true
    authError.value = ''
    if (!user) { ready(); return }
    try {
      const reference = await ensureProfile(user)
      if (version !== generation) return
      stopProfile = onSnapshot(reference, (snapshot) => {
        if (version !== generation) return
        const profile = snapshot.data()
        currentUser.value = profile ? {
          id: user.uid, fullName: profile.fullName, email: user.email,
          role: profile.role === 'organiser' ? 'organiser' : 'member',
        } : null
        if (!profile) authError.value = 'Your account profile is unavailable. Please sign out and sign in again.'
        ready()
      }, () => {
        currentUser.value = null
        authError.value = 'Your account profile could not be loaded. Please sign out and try again.'
        ready()
      })
    } catch {
      if (version !== generation) return
      authError.value = 'Your account profile could not be loaded. Please sign out and try again.'
      ready()
    }
  }, () => { authError.value = 'Unable to restore your session. Please reload the page.'; ready() })
} else {
  authError.value = 'Account access is not available yet. Please try again later.'
  ready()
}
async function perform(operation) {
  if (!auth) return { success: false, message: authError.value }
  if (authBusy.value) return { success: false, message: 'Please wait for the current request.' }
  authBusy.value = true
  try { return await operation() }
  catch (error) { return { success: false, message: authErrorMessage(error) } }
  finally { authBusy.value = false }
}
export const registerUser = ({ fullName, email, password }) => perform(async () => {
  const result = await createUserWithEmailAndPassword(auth, cleanEmail(email), password)
  try {
    await updateProfile(result.user, { displayName: cleanText(fullName) })
    const reference = await ensureProfile(result.user)
    await updateDoc(reference, { fullName: cleanText(fullName) })
    return { success: true, message: 'Your community member account has been created.' }
  } catch {
    return { success: false, message: 'Your login account was created, but your profile could not be saved. Please sign out and sign in again; do not register again.' }
  }
})
export const loginUser = ({ email, password }) => perform(async () => {
  await signInWithEmailAndPassword(auth, cleanEmail(email), password)
  return { success: true, message: 'Signed in successfully.' }
})
export const logoutUser = () => perform(async () => {
  await signOut(auth)
  return { success: true, message: 'You have logged out.' }
})
