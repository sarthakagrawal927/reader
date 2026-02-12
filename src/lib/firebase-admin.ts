import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

type RawServiceAccount = admin.ServiceAccount & {
  project_id?: string;
  private_key?: string;
  client_email?: string;
};

const normalizeServiceAccount = (raw: RawServiceAccount): admin.ServiceAccount => {
  const projectId = raw.projectId ?? raw.project_id;
  const clientEmail = raw.clientEmail ?? raw.client_email;
  const privateKey = (raw.privateKey ?? raw.private_key)?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase service account is missing required fields (projectId, clientEmail, privateKey).'
    );
  }

  return { projectId, clientEmail, privateKey };
};

const loadServiceAccount = (): admin.ServiceAccount => {
  const envValue = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!envValue) {
    throw new Error(
      'Missing FIREBASE_SERVICE_ACCOUNT_KEY. Use the same base64-encoded service account JSON in local and Vercel environments.'
    );
  }

  const trimmed = envValue.trim();

  try {
    const decoded = trimmed.startsWith('{')
      ? trimmed
      : Buffer.from(trimmed, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as RawServiceAccount;
    return normalizeServiceAccount(parsed);
  } catch (error) {
    console.error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY value:', error);
    throw new Error(
      'Invalid FIREBASE_SERVICE_ACCOUNT_KEY. Provide a valid base64-encoded or raw JSON Firebase service account.'
    );
  }
};

// Prevent multiple initializations
if (!admin.apps.length) {
  const credential = admin.credential.cert(loadServiceAccount());
  admin.initializeApp({ credential });
}

export const db = getFirestore();
