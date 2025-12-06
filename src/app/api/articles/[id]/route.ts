import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../../../../lib/firebase-admin';
import { fetchArticleById, normalizeNotes, sanitizeTitle } from '../../../../lib/articles-service';
import { ArticleStatus } from '../../../../types';
import { verifyAuthToken, createAuthRequiredResponse } from '../../../../lib/auth-utils';

const normalizeStatus = (status: unknown): ArticleStatus | null =>
  status === 'read' || status === 'in_progress' ? status : null;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return createAuthRequiredResponse();
    }

    const { id } = await params;
    const article = await fetchArticleById(id, userId);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json({ error: 'Failed to fetch article' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return createAuthRequiredResponse();
    }

    const { id } = await params;
    
    // First check if the article exists and belongs to the user
    const article = await fetchArticleById(id, userId);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const body = await request.json();
    const { notes, title, status, projectId } = body || {};

    const docRef = db.collection('annotations').doc(id);
    const updateData: Record<string, unknown> = {
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

    const normalizedStatus = normalizeStatus(status);
    if (normalizedStatus) {
      updateData.status = normalizedStatus;
    }

    if (typeof projectId === 'string' && projectId.trim()) {
      updateData.projectId = projectId.trim();
    }

    await docRef.update(updateData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return createAuthRequiredResponse();
    }

    const { id } = await params;
    
    // First check if the article exists and belongs to the user
    const article = await fetchArticleById(id, userId);
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const docRef = db.collection('annotations').doc(id);
    await docRef.delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
