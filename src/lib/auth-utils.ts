import * as admin from 'firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function verifyAuthToken(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return null;
  }
}

export function createAuthRequiredResponse() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}