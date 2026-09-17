<script setup>
import BHeader from './components/BHeader.vue'
</script>

<template>
  <div class="main-container">
    <header>
      <BHeader />
    </header>

    <main class="main-box">
      <router-view></router-view>
    </main>
  </div>
</template>

<style scoped>
.main-container {
  min-height: 100vh;
}

.main-box {
  width: min(100% - 2rem, 1120px);
  margin: 0 auto;
  padding: 2rem 0 3rem;
}
</style>
