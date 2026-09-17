<template>
  <section class="add-book-view">
    <h1>Add Book</h1>
    <p class="text-muted">
      Add book details as documents in the Firestore books collection.
    </p>

    <form class="add-book-form" @submit.prevent="addBook">
      <div class="mb-3">
        <label for="book-isbn" class="form-label">ISBN</label>
        <input
          id="book-isbn"
          v-model.number="isbn"
          type="number"
          class="form-control"
          min="1"
          placeholder="1234"
          required
        >
      </div>

      <div class="mb-3">
        <label for="book-name" class="form-label">Name</label>
        <input
          id="book-name"
          v-model.trim="name"
          type="text"
          class="form-control"
          placeholder="Russel"
          required
        >
      </div>

      <p v-if="message" class="text-success">{{ message }}</p>
      <p v-if="error" class="text-danger">{{ error }}</p>

      <button type="submit" class="btn btn-primary">Add book to Firestore</button>
    </form>

    <BookList :refresh-key="refreshKey" />
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import BookList from '../components/BookList.vue'
import db from '../firebase/init'

const isbn = ref('')
const name = ref('')
const message = ref('')
const error = ref('')
const refreshKey = ref(0)

const addBook = async () => {
  message.value = ''
  error.value = ''

  try {
    await addDoc(collection(db, 'books'), {
      isbn: Number(isbn.value),
      name: name.value,
      createdAt: serverTimestamp(),
    })

    message.value = 'Book added to Firestore.'
    isbn.value = ''
    name.value = ''
    refreshKey.value += 1
  } catch (addError) {
    error.value = addError.message
    console.log(addError)
  }
}
</script>

<style scoped>
.add-book-view {
  width: min(100%, 960px);
  margin: 2rem auto 0;
}

.add-book-form {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
}
</style>
