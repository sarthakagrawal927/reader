import { NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const docRef = db.collection('annotations').doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const data = docSnap.data();
    return NextResponse.json({
      id: docSnap.id,
      ...data,
      createdAt: data?.createdAt?.toDate().toISOString(),
      updatedAt: data?.updatedAt?.toDate().toISOString(),
      notesCount: data?.notesCount ?? (Array.isArray(data?.notes) ? data.notes.length : 0),
    });
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
    const { notes, title } = body;

    const docRef = db.collection('annotations').doc(id);
    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    };

    if (Array.isArray(notes)) {
      updateData.notes = notes;
      updateData.notesCount = notes.length;
    }

    if (typeof title === 'string') {
      const trimmedTitle = title.trim().slice(0, 500);
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
