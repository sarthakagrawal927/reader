import { NextRequest, NextResponse } from 'next/server';
import { deleteProject } from '../../../../lib/articles-service';
import { verifyAuthToken, createAuthRequiredResponse } from '../../../../lib/auth-utils';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await verifyAuthToken(request);
    if (!userId) {
      return createAuthRequiredResponse();
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
