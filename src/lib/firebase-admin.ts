import fs from 'fs';
import path from 'path';
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
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(process.cwd(), 'firebase-service-account.json');

  // Prefer a file if the user provided a path or if the default file exists
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_PATH is set but file not found at: ${serviceAccountPath}`
      );
    }
    const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8');
    return normalizeServiceAccount(JSON.parse(fileContent));
  }

  if (fs.existsSync(serviceAccountPath)) {
    const fileContent = fs.readFileSync(serviceAccountPath, 'utf-8');
    return normalizeServiceAccount(JSON.parse(fileContent));
  }

  // Fallback to env string (base64 or raw JSON) for serverless (e.g., Vercel)
  const envValue = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;

  if (envValue) {
    const decoded = envValue.trim().startsWith('{')
      ? envValue
      : Buffer.from(envValue, 'base64').toString('utf-8');
    return normalizeServiceAccount(JSON.parse(decoded));
  }

  throw new Error(
    'No Firebase service account found. Provide FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_KEY (base64 JSON).'
  );
};

// Initialize Firebase only if not in build phase and not already initialized
if (!admin.apps.length && process.env.NEXT_PHASE !== 'phase-production-build') {
  try {
    const credential = admin.credential.cert(loadServiceAccount());
    admin.initializeApp({ credential });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Firebase initialization failed:', error);
    }
  }
}

export const db = admin.apps.length ? getFirestore() : null;
