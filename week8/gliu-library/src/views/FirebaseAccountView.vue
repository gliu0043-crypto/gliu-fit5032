<template>
  <section class="firebase-account-view">
    <h1>Firebase Account</h1>

    <div v-if="currentUser" class="account-card">
      <p class="mb-1"><strong>Email:</strong> {{ currentUser.email }}</p>
      <p class="mb-1"><strong>User UID:</strong> {{ currentUser.uid }}</p>
      <p class="mb-0"><strong>Current role:</strong> {{ roleLabels[currentRole] }}</p>
    </div>

    <p v-else class="alert alert-warning">
      No Firebase user is currently signed in.
    </p>

    <div class="mt-3">
      <router-link to="/FireLogin" class="btn btn-primary me-2">
        Sign in
      </router-link>
      <router-link to="/FireLogout" class="btn btn-secondary">
        Log out page
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/init'
import { getSavedUserRole, roleLabels } from '../firebase/roles'

const currentUser = ref(auth.currentUser)
const currentRole = ref('member')

let unsubscribe = null

onMounted(() => {
  unsubscribe = onAuthStateChanged(auth, (user) => {
    currentUser.value = user
    currentRole.value = user ? getSavedUserRole(user.uid) : 'member'
    console.log('Firebase current user:', user)
    console.log('Current role:', currentRole.value)
  })
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})
</script>

<style scoped>
.firebase-account-view {
  width: min(100%, 760px);
  margin: 2rem auto 0;
}

.account-card {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
}
</style>
