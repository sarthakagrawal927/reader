import { NextResponse } from 'next/server';
import { db } from '../../../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const snapshot = await db
      .collection('annotations')
      .orderBy('createdAt', 'desc')
      .get();

    const articles = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        url: data.url,
        title: data.title || data.url,
        byline: data.byline,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
        notesCount: typeof data.notesCount === 'number'
          ? data.notesCount
          : (Array.isArray(data.notes) ? data.notes.length : 0),
      };
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, title, byline, content } = body;
    const normalizedTitle = (title?.trim() || url).slice(0, 500);

    const docRef = await db.collection('annotations').add({
      url,
      title: normalizedTitle,
      byline,
      content,
      notes: [],
      notesCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ id: docRef.id });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
