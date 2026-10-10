import { ref } from 'vue'
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, requireDatabase } from '../firebase/init'
import { currentUser } from './auth'

export const ratings = ref([])
export const ratingsError = ref('')
if (db) onSnapshot(collection(db, 'gmcRatings'), (snapshot) => {
  ratings.value = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))
  ratingsError.value = ''
}, () => { ratingsError.value = 'Ratings could not be loaded. Please try again later.' })
export async function addRating(rating) {
  const user = currentUser.value
  if (!user) throw new Error('Please sign in to rate an activity.')
  await setDoc(doc(requireDatabase(), 'gmcRatings', `${rating.eventId}_${user.id}`), {
    eventId: rating.eventId, userId: user.id, score: rating.score,
    reviewerName: user.fullName, comment: rating.comment,
    submittedAt: rating.submittedAt, updatedAt: serverTimestamp(),
  })
}
