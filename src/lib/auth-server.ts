import * as admin from 'firebase-admin';
import { cookies } from 'next/headers';

// Ensure firebase-admin is initialized (imported for side effect)
import './firebase-admin';

const SESSION_COOKIE_NAME = '__session';
const SESSION_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export async function createSessionCookie(idToken: string): Promise<string> {
  return admin.auth().createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRY_MS,
  });
}

export async function verifySessionCookie(
  sessionCookie: string
): Promise<admin.auth.DecodedIdToken> {
  return admin.auth().verifySessionCookie(sessionCookie, true);
}

export async function getCurrentUser(): Promise<admin.auth.DecodedIdToken | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) return null;
    return await verifySessionCookie(sessionCookie);
  } catch {
    return null;
  }
}
