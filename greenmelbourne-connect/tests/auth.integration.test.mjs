import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, setDoc, getDoc, doc, serverTimestamp, terminate } from 'firebase/firestore'
test('real Firebase SDK registration, logout/login, and cross-session profile persistence', async () => {
  const app = initializeApp({ projectId:'demo-greenmelbourne', apiKey:'demo-key', appId:'demo-auth-test' }, 'auth-integration')
  const auth = getAuth(app), db = getFirestore(app)
  connectAuthEmulator(auth,'http://127.0.0.1:9199',{disableWarnings:true})
  connectFirestoreEmulator(db,'127.0.0.1',8188)
  const email = `integration-${Date.now()}@example.com`, password = 'EmulatorTest42!'
  try {
    const account = await createUserWithEmailAndPassword(auth,email,password)
    const id = account.user.uid
    await setDoc(doc(db,'gmcUsers',id),{fullName:'Integration Member',email,role:'member',createdAt:serverTimestamp()})
    await signOut(auth)
    assert.equal(auth.currentUser,null)
    await assert.rejects(signInWithEmailAndPassword(auth,email,'incorrect-password'))
    const signedIn = await signInWithEmailAndPassword(auth,email,password)
    assert.equal(signedIn.user.uid,id)
    assert.equal((await getDoc(doc(db,'gmcUsers',id))).data().role,'member')
  } finally { await signOut(auth); await terminate(db); await deleteApp(app) }
})
