import { Timestamp } from 'firebase-admin/firestore';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { db } from './firebase-admin';
import { Article, ArticleSummary, Note } from '../types';

const jsdomWindow = new JSDOM('').window as unknown as Window & typeof globalThis;
const purifier = DOMPurify(jsdomWindow);

type NoteInput = {
  id: string | number;
  text?: unknown;
  top?: unknown;
  left?: unknown;
};

const isNoteInput = (value: unknown): value is NoteInput => {
  if (typeof value !== 'object' || value === null) return false;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' || typeof id === 'number';
};

export const sanitizePlainText = (value: unknown) => purifier.sanitize(String(value ?? '')).trim();

const sanitizeHTML = (value: unknown) => purifier.sanitize(String(value ?? ''));

export const sanitizeTitle = (value: unknown, fallback = '') =>
  sanitizePlainText(value ?? fallback).slice(0, 500);

export async function fetchArticleSummaries(): Promise<ArticleSummary[]> {
  const snapshot = await db.collection('annotations').orderBy('createdAt', 'desc').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      url: data.url,
      title: data.title || data.url,
      byline: data.byline,
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
  const doc = await db.collection('annotations').doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    url: data.url,
    title: data.title,
    byline: data.byline,
    content: data.content,
    notes: data.notes ?? [],
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
        top: Number(note.top) || 0,
      };

      if (typeof note.left === 'number') {
        normalizedNote.left = note.left;
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
  };
}

export async function createArticleRecord(payload: {
  url: string;
  title?: string;
  byline?: string;
  content: string;
}) {
  const sanitized = sanitizeArticlePayload(payload);
  const now = Timestamp.now();
  const docRef = await db.collection('annotations').add({
    ...sanitized,
    notes: [],
    notesCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}
