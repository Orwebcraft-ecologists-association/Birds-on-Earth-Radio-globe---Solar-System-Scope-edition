# Firestore Security Specification

## 1. Data Invariants
1. **PII Isolation**: Private user profile documents (`/users/{userId}/private/profile`) can only be read or written by the matching authenticated user (`request.auth.uid == userId`) with verified email (`request.auth.token.email_verified == true`), or a verified bootstrapped admin.
2. **Favorite Ownership**: Favorite stations (`/users/{userId}/favorites/{stationId}`) require `ownerId == request.auth.uid == userId` and `stationuuid == stationId`, with strict field allowlists, valid coordinates, and server timestamps.
3. **Submission Integrity**: Radio station submissions (`/submittedStations/{stationId}`) and tree observations (`/treeObservations/{observationId}`) must be created with `status == 'pending'`, `ownerId == request.auth.uid`, `createdAt == request.time`, `updatedAt == request.time`, and bounded string/coordinate values.
4. **Immutable Ownership & Terminal Locking**: `ownerId`, `createdAt`, and entity IDs (`stationId`, `observationId`) cannot be changed on update. Non-admins cannot self-approve (`status` stays `'pending'`) and cannot modify documents once `status` reaches `'approved'` or `'rejected'`.
5. **Query Security**: `list` rules explicitly filter on `resource.data` (`resource.data.ownerId == request.auth.uid` or `resource.data.status == 'approved'`) without calling `get()` or `exists()`.
6. **Video Prompt History Metadata Isolation**: Per-user prompt history documents (`/users/{userId}/videoCreations/{creationId}`) store strictly bounded prompt metadata (`ownerId`, `mode`, `prompt <= 1000`, `aspectRatio`, `createdAt`), never binary image/video payloads, and are readable/creatable/deletable exclusively by the verified owner or admin.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Profile Read**: Read `/users/userA/private/profile` with `auth == null`.
2. **Cross-User PII Access**: Read `/users/userA/private/profile` as `userB` (`email_verified: true`).
3. **Unverified Email Write**: Create `/users/userA/favorites/st1` with `email_verified: false`.
4. **Identity Spoofing on Favorite**: Create `/users/userA/favorites/st1` as `userA` with `ownerId: "userB"`.
5. **Shadow Field Injection**: Create `/submittedStations/st1` with an extra ghost field `isVerified: true`.
6. **Self-Approval Escalation**: Create `/submittedStations/st1` with `status: "approved"` as a regular user.
7. **Status Shortcutting on Update**: Update `/submittedStations/st1` as owner changing `status` from `"pending"` to `"approved"`.
8. **Terminal State Mutation**: Update `/submittedStations/st1` as owner when `existing().status == "approved"`.
9. **Timestamp Forgery**: Create `/treeObservations/obs1` with `createdAt` set to a client `Timestamp` instead of `request.time`.
10. **ID Poisoning**: Create `/submittedStations/` with a 200-character document ID or invalid characters (`../bad`).
11. **Oversized String / Resource Poisoning**: Create `/submittedStations/st1` with a 5,000-character `name` or non-HTTP `url_resolved: "javascript:alert(1)"`.
12. **Blanket List Query**: List `/submittedStations` without a `where('status', '==', 'approved')` or `where('ownerId', '==', uid)` constraint as a non-admin user.

## 3. Verification Test Runner (`firestore.rules.test.ts` Reference)
```ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import fs from 'fs';

// Designed for @firebase/rules-unit-testing against the Firebase Emulator Suite
export async function runDirtyDozenSuite() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'gen-lang-client-0103843070',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
  });

  const userA = testEnv.authenticatedContext('userA', { email: 'a@example.com', email_verified: true });
  const userB = testEnv.authenticatedContext('userB', { email: 'b@example.com', email_verified: true });
  const unverified = testEnv.authenticatedContext('userA', { email: 'a@example.com', email_verified: false });
  const anon = testEnv.unauthenticatedContext();

  // 1-12: All 12 adversarial operations must fail with PERMISSION_DENIED
  await assertFails(getDoc(doc(anon.firestore(), 'users/userA/private/profile')));
  await assertFails(getDoc(doc(userB.firestore(), 'users/userA/private/profile')));
  await assertFails(setDoc(doc(unverified.firestore(), 'users/userA/favorites/st1'), {
    stationuuid: 'st1', ownerId: 'userA', name: 'Test', url_resolved: 'https://example.com/a',
    country: 'Israel', geo_lat: 32, geo_long: 34, bitrate: 128, createdAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(userA.firestore(), 'users/userA/favorites/st1'), {
    stationuuid: 'st1', ownerId: 'userB', name: 'Test', url_resolved: 'https://example.com/a',
    country: 'Israel', geo_lat: 32, geo_long: 34, bitrate: 128, createdAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(userA.firestore(), 'submittedStations/st1'), {
    stationId: 'st1', ownerId: 'userA', name: 'Test', url_resolved: 'https://example.com/a',
    country: 'Israel', state: '', tags: '', geo_lat: 32, geo_long: 34, bitrate: 128,
    status: 'pending', isVerified: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(userA.firestore(), 'submittedStations/st2'), {
    stationId: 'st2', ownerId: 'userA', name: 'Test', url_resolved: 'https://example.com/a',
    country: 'Israel', state: '', tags: '', geo_lat: 32, geo_long: 34, bitrate: 128,
    status: 'approved', createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(userA.firestore(), 'submittedStations/st_pending'), {
    status: 'approved', updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(userA.firestore(), 'submittedStations/st_approved'), {
    name: 'Tampered', updatedAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(userA.firestore(), 'treeObservations/obs1'), {
    observationId: 'obs1', ownerId: 'userA', common_name: 'Oak', scientific_name: 'Quercus',
    imageUrl: 'https://example.com/oak.jpg', lat: 32, lon: 34, status: 'pending',
    createdAt: Timestamp.fromMillis(1000), updatedAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(userA.firestore(), `submittedStations/${'a'.repeat(200)}`), {
    stationId: 'a'.repeat(200), ownerId: 'userA', name: 'Test', url_resolved: 'https://example.com/a',
    country: 'Israel', geo_lat: 32, geo_long: 34, bitrate: 128, status: 'pending',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  await assertFails(setDoc(doc(userA.firestore(), 'submittedStations/st3'), {
    stationId: 'st3', ownerId: 'userA', name: 'Test', url_resolved: 'javascript:alert(1)',
    country: 'Israel', geo_lat: 32, geo_long: 34, bitrate: 128, status: 'pending',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  }));
  await assertFails(getDocs(collection(userB.firestore(), 'submittedStations')));

  // Valid query succeeds
  await assertSucceeds(getDocs(query(collection(userB.firestore(), 'submittedStations'), where('status', '==', 'approved'))));
  await testEnv.cleanup();
}
```
