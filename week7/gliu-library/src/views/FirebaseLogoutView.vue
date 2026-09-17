<template>
  <section class="firebase-logout-view">
    <h1>Firebase Logout</h1>
    <p class="text-muted">
      Use this page to test sign-out and inspect the current user in the
      developer console.
    </p>

    <div class="logout-card">
      <p v-if="currentUser">
        Current user before logout: <strong>{{ currentUser.email }}</strong>
      </p>
      <p v-else class="alert alert-warning">No Firebase user is signed in.</p>

      <p v-if="message" class="text-success">{{ message }}</p>
      <button type="button" class="btn btn-danger" @click="logoutFromFirebase">
        Log out from Firebase
      </button>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../firebase/init'

const currentUser = ref(auth.currentUser)
const message = ref('')

let unsubscribe = null

onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    console.log('Firebase current user on logout page:', user)
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

const logoutFromFirebase = async () => {
  console.log('Firebase current user before logout:', auth.currentUser)
  await signOut(auth)
  console.log('Firebase current user after logout:', auth.currentUser)
  message.value = 'Firebase user logged out. Current user is now null.'
}
</script>

<style scoped>
.firebase-logout-view {
  width: min(100%, 640px);
  margin: 2rem auto 0;
}

.logout-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
}
</style>
