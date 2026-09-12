import { ref } from 'vue'

const ratingsStorageKey = 'greenmelbourne-connect-ratings'

const readRatings = () => {
  try {
    if (typeof localStorage === 'undefined') {
      return []
    }

    const savedRatings = localStorage.getItem(ratingsStorageKey)

    if (!savedRatings) {
      return []
    }

    const parsedRatings = JSON.parse(savedRatings)
    return Array.isArray(parsedRatings) ? parsedRatings : []
  } catch {
    return []
  }
}

const saveRatings = () => {
  try {
    if (typeof localStorage === 'undefined') {
      return
    }

    localStorage.setItem(ratingsStorageKey, JSON.stringify(ratings.value))
  } catch {
    return
  }
}

export const ratings = ref(readRatings())

export const addRating = (rating) => {
  ratings.value.unshift(rating)
  saveRatings()
}
