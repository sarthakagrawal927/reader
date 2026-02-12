import { NextResponse } from 'next/server';
import { deleteProject } from '../../../../lib/articles-service';
import { getAuthenticatedUserId } from '../../../../lib/auth-api';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Project id is required' }, { status: 400 });
    }
    await deleteProject(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
