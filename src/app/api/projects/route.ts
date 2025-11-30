import { NextRequest, NextResponse } from 'next/server';
import { createProject, fetchProjects } from '../../../lib/articles-service';

export async function GET() {
  try {
    const projects = await fetchProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body || {};
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }
    const id = await createProject(name);
    return NextResponse.json({ id });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
