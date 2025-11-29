import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../../../../lib/firebase-admin';
import { fetchArticleById, normalizeNotes, sanitizeTitle } from '../../../../lib/articles-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const article = await fetchArticleById(id);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, title } = body || {};

    const docRef = db.collection('annotations').doc(id);
    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    };

    if (notes !== undefined) {
      const normalized = normalizeNotes(notes);
      updateData.notes = normalized;
      updateData.notesCount = normalized.length;
    }

    if (typeof title === 'string') {
      const trimmedTitle = sanitizeTitle(title);
      if (trimmedTitle.length > 0) {
        updateData.title = trimmedTitle;
      }
    }

    await docRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docRef = db.collection('annotations').doc(id);
    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
