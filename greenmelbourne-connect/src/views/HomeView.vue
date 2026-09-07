<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="hero-section">
    <div class="container">
      <div class="row align-items-center g-4">
        <div class="col-12 col-lg-7">
          <p class="eyebrow">Urban greening and biodiversity</p>
          <h1>Find local ways to make Melbourne greener.</h1>
          <p class="hero-copy">
            GreenMelbourne Connect helps residents discover tree-planting events,
            biodiversity workshops, and practical community action close to home.
          </p>
          <div class="d-flex flex-column flex-sm-row gap-3 mt-4">
            <RouterLink class="btn btn-success btn-lg" to="/activities">Explore events</RouterLink>
            <RouterLink class="btn btn-outline-dark btn-lg" to="/join">Register interest</RouterLink>
          </div>
        </div>

        <div class="col-12 col-lg-5">
          <div class="impact-panel">
            <p class="panel-label">Community focus</p>
            <h2>Tree planting, habitat care, and native garden learning.</h2>
            <p>
              Discover practical activities that help local streets, parks,
              and gardens become healthier places for people and wildlife.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="content-section home-preview-section">
    <div class="container">
      <div class="section-heading">
        <p class="eyebrow">How it works</p>
        <h2>Choose a local action pathway.</h2>
        <p>
          Browse upcoming activities, register your interest, and access member tools
          through a clear account area.
        </p>
      </div>

      <div class="row g-4">
        <div class="col-12 col-md-4">
          <article class="info-card h-100">
            <h3>Explore</h3>
            <p>Find nearby planting days, habitat care sessions, and biodiversity workshops.</p>
            <RouterLink to="/activities">View activities</RouterLink>
          </article>
        </div>

        <div class="col-12 col-md-4">
          <article class="info-card h-100">
            <h3>Join</h3>
            <p>Register your interest so organisers can plan places, tools, and support.</p>
            <RouterLink to="/join">Join an event</RouterLink>
          </article>
        </div>

        <div class="col-12 col-md-4">
          <article class="info-card h-100">
            <h3>Access</h3>
            <p>Use the member access page for account-based features and role-specific areas.</p>
            <RouterLink to="/auth">Member access</RouterLink>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>
