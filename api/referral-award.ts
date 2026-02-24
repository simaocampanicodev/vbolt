import admin from 'firebase-admin';

const getAdminApp = () => {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
  return admin.app();
};

const REFERRAL_XP_REWARD = 500;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
    return;
  }
  try {
    const { referrerId, newUserId } = req.body || {};
    if (!referrerId || !newUserId || typeof referrerId !== 'string' || typeof newUserId !== 'string') {
      res.status(400).json({ ok: false, error: 'referrerId and newUserId are required' });
      return;
    }
    if (referrerId === newUserId) {
      res.status(400).json({ ok: false, error: 'Self referral is not allowed' });
      return;
    }
    const app = getAdminApp();
    const db = app.firestore();
    const newUserRef = db.doc(`users/${newUserId}`);
    const referrerRef = db.doc(`users/${referrerId}`);

    const [newUserSnap, referrerSnap] = await Promise.all([newUserRef.get(), referrerRef.get()]);
    if (!newUserSnap.exists) {
      res.status(404).json({ ok: false, error: 'New user not found' });
      return;
    }
    if (!referrerSnap.exists) {
      res.status(404).json({ ok: false, error: 'Referrer not found' });
      return;
    }
    const newUserData = newUserSnap.data() || {};
    const referrerData = referrerSnap.data() || {};
    if (String(newUserData.referred_by) !== referrerId) {
      res.status(400).json({ ok: false, error: 'Referral mismatch' });
      return;
    }
    if (newUserData.referral_award_processed === true) {
      res.status(200).json({ ok: true, message: 'Already processed' });
      return;
    }
    await db.runTransaction(async (tx) => {
      const freshNewUserSnap = await tx.get(newUserRef);
      const freshReferrerSnap = await tx.get(referrerRef);
      const freshNewUserData = freshNewUserSnap.data() || {};
      const freshReferrerData = freshReferrerSnap.data() || {};
      if (freshNewUserData.referral_award_processed === true) {
        return;
      }
      const currentXp = typeof freshReferrerData.xp === 'number' ? freshReferrerData.xp : 0;
      const currentCount = typeof freshReferrerData.referral_count === 'number' ? freshReferrerData.referral_count : 0;
      tx.update(referrerRef, {
        xp: currentXp + REFERRAL_XP_REWARD,
        referral_count: currentCount + 1,
        referral_awarded_ids: admin.firestore.FieldValue.arrayUnion(newUserId),
      });
      tx.update(newUserRef, {
        referral_award_processed: true,
      });
    });
    res.status(200).json({ ok: true, awarded: REFERRAL_XP_REWARD });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Internal Error' });
  }
}
