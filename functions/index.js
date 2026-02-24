const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Referral reward amount (XP)
const REFERRAL_XP_REWARD = 500;

/**
 * Shared logic: apply playerPointsChanges to users and mark match as processed.
 * Used by both the Firestore trigger and the callable (so points are applied even if trigger is not deployed).
 */
async function applyPointsToUsers(matchId, matchRef, changes) {
  if (!changes || changes.length === 0) {
    await matchRef.update({ resultProcessed: true });
    return;
  }
  console.log(`Processing match ${matchId} — applying ${changes.length} player point changes`);

  const tasks = changes.map((c) => {
    return db.runTransaction(async (tx) => {
      const userRef = db.doc(`users/${c.playerId}`);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        console.warn(`User ${c.playerId} not found — skipping`);
        return;
      }
      const user = userSnap.data() || {};

      const alreadyApplied = (user.lastPointsChange === c.pointsChange) && (user.points === c.newTotal);
      if (alreadyApplied) {
        console.log(`User ${c.playerId} already updated — skipping`);
        return;
      }

      const newPoints = (typeof c.newTotal === 'number') ? c.newTotal : ((user.points || 0) + (c.pointsChange || 0));
      const lastPointsChange = (typeof c.pointsChange === 'number') ? c.pointsChange : 0;
      const wins = (user.wins || 0) + (c.isWinner ? 1 : 0);
      const losses = (user.losses || 0) + (c.isWinner ? 0 : 1);
      const winstreak = c.isWinner ? ((user.winstreak || 0) + 1) : 0;

      console.log(`Updating user ${c.playerId}: points ${user.points} -> ${newPoints}, lastChange ${lastPointsChange}`);

      tx.update(userRef, {
        points: newPoints,
        lastPointsChange: lastPointsChange,
        wins: wins,
        losses: losses,
        winstreak: winstreak
      });
    });
  });

  await Promise.all(tasks);
  await matchRef.update({ resultProcessed: true, processedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log(`Match ${matchId} processed successfully`);
}

/**
 * Cloud Function: applyMatchResults (trigger)
 * Trigger: onUpdate active_matches/{matchId}
 */
exports.applyMatchResults = functions.firestore
  .document('active_matches/{matchId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data() || {};
    const matchId = context.params.matchId;

    if (!after.resultReported) return null;
    if (after.resultProcessed) {
      console.log(`match ${matchId} already processed`);
      return null;
    }

    const changes = Array.isArray(after.playerPointsChanges) ? after.playerPointsChanges : [];
    try {
      await applyPointsToUsers(matchId, change.after.ref, changes);
    } catch (err) {
      console.error('Error processing match results:', err);
      throw err;
    }
    return null;
  });

/**
 * Cloud Function: processMatchResult (callable)
 * Client calls this after finalizing a match so points are applied even if the trigger didn't run.
 */
exports.processMatchResult = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }
  const matchId = data?.matchId;
  if (!matchId || typeof matchId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'matchId is required');
  }

  const matchRef = db.doc(`active_matches/${matchId}`);
  const snap = await matchRef.get();
  if (!snap.exists) {
    throw new functions.https.HttpsError('not-found', 'Match not found');
  }

  const d = snap.data();
  if (!d.resultReported) {
    throw new functions.https.HttpsError('failed-precondition', 'Match result not reported yet');
  }
  if (d.resultProcessed) {
    return { ok: true, message: 'Already processed' };
  }

  const players = d.players || [];
  if (!players.includes(context.auth.uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Not a participant of this match');
  }

  const changes = Array.isArray(d.playerPointsChanges) ? d.playerPointsChanges : [];
  await applyPointsToUsers(matchId, matchRef, changes);
  return { ok: true, message: 'Points applied' };
});

/**
 * Cloud Function: awardReferralOnUserCreate (trigger)
 * Trigger: onCreate users/{userId}
 * When a user document is created and contains `referred_by`, award XP to the referrer.
 */
exports.awardReferralOnUserCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    try {
      const newUser = snap.data() || {};
      const userId = context.params.userId;
      const referrerId = newUser.referred_by;
      if (!referrerId || typeof referrerId !== 'string') {
        console.log(`User ${userId} created without referral.`);
        return null;
      }
      if (referrerId === userId) {
        console.warn(`User ${userId} referred themselves — skipping reward.`);
        return null;
      }
      const refRef = db.doc(`users/${referrerId}`);
      const refSnap = await refRef.get();
      if (!refSnap.exists) {
        console.warn(`Referrer ${referrerId} not found — skipping reward.`);
        return null;
      }
      const refData = refSnap.data() || {};
      const currentXp = typeof refData.xp === 'number' ? refData.xp : 0;
      const currentCount = typeof refData.referral_count === 'number' ? refData.referral_count : 0;
      await refRef.update({
        xp: currentXp + REFERRAL_XP_REWARD,
        referral_count: currentCount + 1,
      });
      console.log(`Awarded ${REFERRAL_XP_REWARD} XP to referrer ${referrerId} for new user ${userId}.`);
      return null;
    } catch (err) {
      console.error('Error awarding referral XP:', err);
      throw err;
    }
  });
