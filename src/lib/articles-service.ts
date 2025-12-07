import { Timestamp } from 'firebase-admin/firestore';
import sanitizeHtml from 'sanitize-html';
import type { IOptions } from 'sanitize-html';
import { db } from './firebase-admin';
import { Article, ArticleStatus, ArticleSummary, Note, Project } from '../types';

const baseAllowedAttributes = sanitizeHtml.defaults.allowedAttributes ?? {};
const plainTextSanitizeOptions: IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  allowedSchemes: [],
  allowedSchemesByTag: {},
  disallowedTagsMode: 'discard',
  enforceHtmlBoundary: false,
};

const htmlSanitizeOptions: IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'img',
    'picture',
    'source',
    'video',
    'iframe',
  ],
  allowedAttributes: {
    ...baseAllowedAttributes,
    '*': ['class', 'id', 'lang', 'dir'],
    a: [...(baseAllowedAttributes.a ?? []), 'rel'],
    img: [...(baseAllowedAttributes.img ?? []), 'sizes'],
    iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'loading'],
  },
  allowedSchemes: sanitizeHtml.defaults.allowedSchemes,
  allowedSchemesByTag: {
    ...(sanitizeHtml.defaults.allowedSchemesByTag ?? {}),
    img: ['http', 'https', 'data'],
    iframe: ['http', 'https'],
  },
  allowedIframeHostnames: ['www.youtube.com', 'player.vimeo.com'],
};

type NoteInput = {
  id: string | number;
  text?: unknown;
  anchor?: unknown;
};

type NoteAnchorInput = {
  elementIndex?: unknown;
  tagName?: unknown;
  textPreview?: unknown;
};

const isNoteInput = (value: unknown): value is NoteInput => {
  if (typeof value !== 'object' || value === null) return false;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' || typeof id === 'number';
};

const isNoteAnchorInput = (value: unknown): value is NoteAnchorInput =>
  typeof value === 'object' && value !== null;

const normalizeAnchor = (anchor: NoteAnchorInput) => {
  const index = Number(anchor.elementIndex);
  if (!Number.isFinite(index)) return null;

  return {
    elementIndex: Math.max(0, Math.round(index)),
    tagName: anchor.tagName
      ? sanitizePlainText(anchor.tagName).toLowerCase().slice(0, 40)
      : undefined,
    textPreview: anchor.textPreview
      ? sanitizePlainText(anchor.textPreview).slice(0, 240)
      : undefined,
  };
};

export const sanitizePlainText = (value: unknown) =>
  sanitizeHtml(String(value ?? ''), plainTextSanitizeOptions).trim();

const sanitizeHTML = (value: unknown) => sanitizeHtml(String(value ?? ''), htmlSanitizeOptions);

export const sanitizeTitle = (value: unknown, fallback = '') =>
  sanitizePlainText(value ?? fallback).slice(0, 500);

const DEFAULT_PROJECT_ID = 'default';
const DEFAULT_PROJECT_NAME = 'Default';

const normalizeStatus = (status: unknown): ArticleStatus => {
  return status === 'read' ? 'read' : 'in_progress';
};

export async function fetchArticleSummaries(projectId?: string): Promise<ArticleSummary[]> {
  if (!db) return [];
  let collection = db.collection('annotations').orderBy('createdAt', 'desc');
  if (projectId && projectId !== 'all') {
    collection = db.collection('annotations').where('projectId', '==', projectId);
  }
  const snapshot = await collection.get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const status = normalizeStatus(data.status);
    return {
      id: doc.id,
      url: data.url,
      title: data.title || data.url,
      byline: data.byline,
      projectId: data.projectId || DEFAULT_PROJECT_ID,
      status,
      notesCount:
        typeof data.notesCount === 'number'
          ? data.notesCount
          : Array.isArray(data.notes)
            ? data.notes.length
            : 0,
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString(),
    };
  });
}

export async function fetchArticleById(id: string): Promise<Article | null> {
  if (!db) return null;
  const doc = await db.collection('annotations').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  const status = normalizeStatus(data.status);
  return {
    id: doc.id,
    url: data.url,
    title: data.title,
    byline: data.byline,
    content: data.content,
    notes: data.notes ?? [],
    projectId: data.projectId || DEFAULT_PROJECT_ID,
    status,
    notesCount:
      typeof data.notesCount === 'number'
        ? data.notesCount
        : Array.isArray(data.notes)
          ? data.notes.length
          : 0,
    createdAt: data.createdAt?.toDate().toISOString(),
    updatedAt: data.updatedAt?.toDate().toISOString(),
  };
}

export function normalizeNotes(payload: unknown): Note[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((note) => {
      if (!isNoteInput(note)) return null;
      const normalizedNote: Note = {
        id: Number(note.id) || Date.now(),
        text: sanitizePlainText(note.text),
      };

      if (isNoteAnchorInput(note.anchor)) {
        const normalizedAnchor = normalizeAnchor(note.anchor);
        if (normalizedAnchor) {
          normalizedNote.anchor = normalizedAnchor;
        }
      }

      return normalizedNote;
    })
    .filter(Boolean) as Note[];
}

export function sanitizeArticlePayload(payload: {
  url: string;
  title?: string;
  byline?: string;
  content: string;
  projectId?: string;
}) {
  const sanitizedUrl = sanitizePlainText(payload.url);
  if (!sanitizedUrl) {
    throw new Error('URL is required');
  }

  return {
    url: sanitizedUrl,
    title: sanitizeTitle(payload.title, sanitizedUrl),
    byline: sanitizePlainText(payload.byline || ''),
    content: sanitizeHTML(payload.content),
    projectId: sanitizePlainText(payload.projectId || DEFAULT_PROJECT_ID) || DEFAULT_PROJECT_ID,
  };
}

export async function createArticleRecord(payload: {
  url: string;
  title?: string;
  byline?: string;
  content: string;
  projectId?: string;
}) {
  if (!db) throw new Error('Database not available');
  const sanitized = sanitizeArticlePayload(payload);
  const now = Timestamp.now();
  const docRef = await db.collection('annotations').add({
    ...sanitized,
    notes: [],
    notesCount: 0,
    status: 'in_progress',
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

const sanitizeProjectName = (value: unknown) => sanitizeTitle(value, DEFAULT_PROJECT_NAME);

export async function ensureDefaultProject(): Promise<Project> {
  if (!db) throw new Error('Database not available');
  const defaultRef = db.collection('projects').doc(DEFAULT_PROJECT_ID);
  const snapshot = await defaultRef.get();
  if (!snapshot.exists) {
    const now = Timestamp.now();
    await defaultRef.set({
      name: DEFAULT_PROJECT_NAME,
      createdAt: now,
      updatedAt: now,
    });
  }
  const fresh = await defaultRef.get();
  const data = fresh.data() || {};
  return {
    id: DEFAULT_PROJECT_ID,
    name: data.name || DEFAULT_PROJECT_NAME,
    createdAt: data.createdAt?.toDate().toISOString(),
    updatedAt: data.updatedAt?.toDate().toISOString(),
  };
}

export async function fetchProjects(): Promise<Project[]> {
  const defaultProject = await ensureDefaultProject();
  if (!db) return [defaultProject];
  const snapshot = await db.collection('projects').orderBy('createdAt', 'desc').get();
  const projects: Project[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || DEFAULT_PROJECT_NAME,
      createdAt: data.createdAt?.toDate().toISOString(),
      updatedAt: data.updatedAt?.toDate().toISOString(),
    };
  });

  const merged = [defaultProject, ...projects.filter((p) => p.id !== DEFAULT_PROJECT_ID)];
  const seen = new Set<string>();
  return merged.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

export async function createProject(name: string): Promise<string> {
  if (!db) throw new Error('Database not available');
  const sanitizedName = sanitizeProjectName(name);
  if (!sanitizedName) {
    throw new Error('Project name is required');
  }
  const now = Timestamp.now();
  const ref = await db.collection('projects').add({
    name: sanitizedName,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function moveArticlesToDefault(projectId: string) {
  if (projectId === DEFAULT_PROJECT_ID) return;
  if (!db) return;
  const snapshot = await db.collection('annotations').where('projectId', '==', projectId).get();
  const batch = db.batch();
  snapshot.forEach((doc) => {
    batch.update(doc.ref, { projectId: DEFAULT_PROJECT_ID, updatedAt: Timestamp.now() });
  });
  if (!snapshot.empty) {
    await batch.commit();
  }
}

export async function deleteProject(projectId: string) {
  if (projectId === DEFAULT_PROJECT_ID) {
    throw new Error('Cannot delete default project');
  }
  if (!db) throw new Error('Database not available');
  await moveArticlesToDefault(projectId);
  await db.collection('projects').doc(projectId).delete();
}
