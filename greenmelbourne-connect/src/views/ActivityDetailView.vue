<script setup>
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { currentUser } from '../data/auth'
import { events } from '../data/events'
import { addRating, ratings } from '../data/ratings'
import { cleanLongText, cleanText } from '../data/security'

const route = useRoute()
const event = computed(() => events.find((activity) => activity.id === Number(route.params.id)))
const ratingMessage = ref('')

const ratingForm = reactive({
  score: '',
  reviewerName: '',
  comment: '',
})

const ratingErrors = reactive({
  score: '',
  reviewerName: '',
  comment: '',
})

const ratingScores = [5, 4, 3, 2, 1]

const eventRatings = computed(() => {
  if (!event.value) {
    return []
  }

  return ratings.value.filter((rating) => rating.eventId === event.value.id)
})

const averageRating = computed(() => {
  if (eventRatings.value.length === 0) {
    return null
  }

  const totalScore = eventRatings.value.reduce((total, rating) => total + Number(rating.score), 0)
  return totalScore / eventRatings.value.length
})

const averageRatingText = computed(() =>
  averageRating.value ? `${averageRating.value.toFixed(1)} / 5` : 'No ratings yet',
)

const reviewerName = computed(() =>
  currentUser.value ? cleanText(currentUser.value.fullName) : cleanText(ratingForm.reviewerName),
)

const validateRating = () => {
  ratingErrors.score = Number(ratingForm.score) ? '' : 'Choose a rating score.'
  ratingErrors.reviewerName =
    reviewerName.value.length >= 2 ? '' : 'Enter your name before submitting.'
  ratingErrors.comment =
    cleanLongText(ratingForm.comment).length >= 10
      ? ''
      : 'Write at least 10 characters about this activity.'

  return !ratingErrors.score && !ratingErrors.reviewerName && !ratingErrors.comment
}

const resetRatingForm = () => {
  ratingForm.score = ''
  ratingForm.reviewerName = ''
  ratingForm.comment = ''
  Object.keys(ratingErrors).forEach((fieldName) => {
    ratingErrors[fieldName] = ''
  })
}

const submitRating = () => {
  ratingMessage.value = ''

  if (!event.value || !validateRating()) {
    return
  }

  addRating({
    id: Date.now(),
    eventId: event.value.id,
    score: Number(ratingForm.score),
    reviewerName: reviewerName.value,
    comment: cleanLongText(ratingForm.comment),
    submittedAt: new Date().toLocaleDateString('en-AU'),
  })

  ratingMessage.value = 'Thanks. Your activity rating has been saved.'
  resetRatingForm()
}
</script>

<template>
  <section class="content-section page-section">
    <div class="container">
      <div v-if="event" class="row g-4 align-items-start">
        <div class="col-12 col-lg-7">
          <p class="eyebrow">{{ event.type }}</p>
          <h1>{{ event.title }}</h1>
          <p class="hero-copy">{{ event.description }}</p>

          <div class="d-flex flex-column flex-sm-row gap-3 mt-4">
            <RouterLink
              class="btn btn-success btn-lg"
              :to="{ name: 'join', query: { activityId: event.id } }"
            >
              Register interest
            </RouterLink>
            <RouterLink class="btn btn-outline-dark btn-lg" to="/activities">Back to activities</RouterLink>
          </div>
        </div>

        <div class="col-12 col-lg-5">
          <div class="impact-panel">
            <p class="panel-label">Activity details</p>
            <dl class="event-details detail-list">
              <div>
                <dt>Suburb</dt>
                <dd>{{ event.suburb }}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{{ event.date }}</dd>
              </div>
              <div>
                <dt>Places</dt>
                <dd>{{ event.places }} available</dd>
              </div>
              <div>
                <dt>Activity type</dt>
                <dd>{{ event.type }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div v-if="event" class="row g-4 rating-section">
        <div class="col-12 col-lg-5">
          <div class="rating-panel h-100">
            <p class="panel-label">Activity rating</p>
            <h2>{{ averageRatingText }}</h2>
            <p>
              {{ eventRatings.length }}
              {{ eventRatings.length === 1 ? 'rating' : 'ratings' }} submitted for this activity.
            </p>

            <div v-if="eventRatings.length > 0" class="rating-feedback-list">
              <article v-for="rating in eventRatings.slice(0, 3)" :key="rating.id">
                <strong>{{ rating.score }} / 5</strong>
                <p>{{ rating.comment }}</p>
                <span>{{ rating.reviewerName }} - {{ rating.submittedAt }}</span>
              </article>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-7">
          <form class="rating-panel" novalidate @submit.prevent="submitRating">
            <h2>Rate this activity</h2>

            <div v-if="ratingMessage" class="alert alert-success" role="status">
              {{ ratingMessage }}
            </div>

            <fieldset class="mb-3">
              <legend class="form-label">How useful is this activity?</legend>
              <div class="rating-option-grid">
                <label
                  v-for="score in ratingScores"
                  :key="score"
                  class="rating-option"
                  :class="{ selected: Number(ratingForm.score) === score }"
                >
                  <input
                    v-model="ratingForm.score"
                    class="visually-hidden"
                    type="radio"
                    name="rating-score"
                    :value="String(score)"
                    @change="ratingErrors.score = ''"
                  >
                  <span>{{ score }}</span>
                </label>
              </div>
              <div v-if="ratingErrors.score" class="selection-error">
                {{ ratingErrors.score }}
              </div>
            </fieldset>

            <div v-if="!currentUser" class="mb-3">
              <label class="form-label" for="reviewer-name">Your name</label>
              <input
                id="reviewer-name"
                v-model="ratingForm.reviewerName"
                class="form-control"
                :class="{ 'is-invalid': ratingErrors.reviewerName }"
                type="text"
                @input="ratingErrors.reviewerName = ''"
              >
              <div v-if="ratingErrors.reviewerName" class="invalid-feedback">
                {{ ratingErrors.reviewerName }}
              </div>
            </div>

            <div v-else class="selected-activity mb-3">
              <p class="panel-label">Reviewer</p>
              <h3>{{ currentUser.fullName }}</h3>
            </div>

            <div class="mb-4">
              <label class="form-label" for="rating-comment">Short feedback</label>
              <textarea
                id="rating-comment"
                v-model="ratingForm.comment"
                class="form-control"
                :class="{ 'is-invalid': ratingErrors.comment }"
                rows="4"
                @input="ratingErrors.comment = ''"
              ></textarea>
              <div v-if="ratingErrors.comment" class="invalid-feedback">
                {{ ratingErrors.comment }}
              </div>
            </div>

            <button class="btn btn-success btn-lg" type="submit">Submit rating</button>
          </form>
        </div>
      </div>

      <div v-else class="empty-state">
        <h1>Activity not found.</h1>
        <p>The selected activity could not be found in the current activity list.</p>
        <RouterLink class="btn btn-success" to="/activities">View all activities</RouterLink>
      </div>
    </div>
  </section>
</template>
