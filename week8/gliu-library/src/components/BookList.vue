<template>
  <section class="book-list">
    <div class="section-header">
      <div>
        <h2>Books in Firestore</h2>
        <p class="text-muted mb-0">
          Update or delete book documents from the books collection.
        </p>
      </div>
      <button type="button" class="btn btn-outline-primary" @click="loadBooks">
        Refresh
      </button>
    </div>

    <p v-if="status" class="text-success">{{ status }}</p>
    <p v-if="error" class="text-danger">{{ error }}</p>

    <div v-if="books.length" class="table-responsive">
      <table class="table align-middle">
        <thead>
          <tr>
            <th scope="col">Document ID</th>
            <th scope="col">ISBN</th>
            <th scope="col">Name</th>
            <th scope="col" class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="book in books" :key="book.id">
            <td class="book-id">{{ book.id }}</td>
            <td>
              <input
                v-model.number="book.draftIsbn"
                type="number"
                class="form-control"
                min="1"
              >
            </td>
            <td>
              <input v-model.trim="book.draftName" type="text" class="form-control">
            </td>
            <td class="text-end">
              <button
                type="button"
                class="btn btn-sm btn-primary me-2"
                @click="updateBook(book)"
              >
                Update
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                @click="deleteBook(book.id)"
              >
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else class="alert alert-light border">
      No book documents have been added yet.
    </p>

    <section class="query-panel">
      <h2>Books with ISBN &gt; 1000</h2>
      <p class="text-muted">
        This query uses <code>where</code>, <code>orderBy</code>, and
        <code>limit</code>.
      </p>

      <ul v-if="queriedBooks.length">
        <li v-for="book in queriedBooks" :key="book.id">
          {{ book.name }} (ISBN: {{ book.isbn }})
        </li>
      </ul>
      <p v-else class="mb-0">No books match the query yet.</p>
    </section>
  </section>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import db from '../firebase/init'

const props = defineProps({
  refreshKey: {
    type: Number,
    default: 0,
  },
})

const books = ref([])
const queriedBooks = ref([])
const status = ref('')
const error = ref('')

const booksCollection = collection(db, 'books')

const mapBook = (documentSnapshot) => {
  const data = documentSnapshot.data()

  return {
    id: documentSnapshot.id,
    isbn: Number(data.isbn),
    name: data.name,
    draftIsbn: Number(data.isbn),
    draftName: data.name,
  }
}

const loadBooks = async () => {
  status.value = ''
  error.value = ''

  try {
    const allBooksQuery = query(booksCollection, orderBy('isbn', 'asc'))
    const allBooksSnapshot = await getDocs(allBooksQuery)
    books.value = allBooksSnapshot.docs.map(mapBook)

    const filteredBooksQuery = query(
      booksCollection,
      where('isbn', '>', 1000),
      orderBy('isbn', 'asc'),
      limit(5),
    )
    const filteredBooksSnapshot = await getDocs(filteredBooksQuery)
    queriedBooks.value = filteredBooksSnapshot.docs.map(mapBook)
  } catch (loadError) {
    error.value = loadError.message
    console.log(loadError)
  }
}

const updateBook = async (book) => {
  status.value = ''
  error.value = ''

  try {
    await updateDoc(doc(db, 'books', book.id), {
      isbn: Number(book.draftIsbn),
      name: book.draftName,
    })
    status.value = 'Book updated in Firestore.'
    await loadBooks()
  } catch (updateError) {
    error.value = updateError.message
    console.log(updateError)
  }
}

const deleteBook = async (bookId) => {
  status.value = ''
  error.value = ''

  try {
    await deleteDoc(doc(db, 'books', bookId))
    status.value = 'Book deleted from Firestore.'
    await loadBooks()
  } catch (deleteError) {
    error.value = deleteError.message
    console.log(deleteError)
  }
}

onMounted(loadBooks)

watch(
  () => props.refreshKey,
  () => {
    loadBooks()
  },
)
</script>

<style scoped>
.book-list {
  margin-top: 2rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.book-id {
  max-width: 220px;
  overflow-wrap: anywhere;
  font-family: monospace;
  font-size: 0.875rem;
}

.query-panel {
  margin-top: 2rem;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.25rem;
}
</style>
