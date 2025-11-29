import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';

// Prevent multiple initializations
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
    console.log('Firebase Admin Initialized');
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

export const db = getFirestore();
