<template>
  <section class="access-denied-view">
    <h1>Access Denied</h1>
    <p>You need a valid library member login to view this page.</p>
    <router-link to="/login" class="btn btn-primary">Go to Login</router-link>
  </section>
</template>

<style scoped>
.access-denied-view {
  width: min(100%, 680px);
  margin: 2rem auto 0;
}
</style>
