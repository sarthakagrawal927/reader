"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Article, Note, ReaderSettings } from "../types";
import { ReaderView, getThemeClasses } from "./ReaderView";
import { AppearanceToolbar } from "./AppearanceToolbar";

const NOTE_MARKER_SIZE = 32;
const NOTE_MARKER_RADIUS = NOTE_MARKER_SIZE / 2;
const BLURRED_ZONE_PERCENT = 0.2;

export default function ReaderClient({ articleId }: { articleId: string }) {
  const id = articleId;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [notes, setNotes] = useState<Note[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [isTitleEditing, setIsTitleEditing] = useState(false);

  // Layout State
  const [leftPanelWidth, setLeftPanelWidth] = useState(66.66);
  const isDraggingRef = useRef(false);

  // Settings State
  const [settings, setSettings] = useState<ReaderSettings>({
    fontSize: 'medium',
    theme: 'dark',
    fontFamily: 'sans'
  });

  const snapshotContainerRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const hasInitializedNotesRef = useRef(false);
  const nextNoteIdRef = useRef<number>(Date.now());

  const {
    data: article,
    isLoading: isArticleLoading,
    error: articleError,
  } = useQuery<Article>({
    queryKey: ['article', id],
    queryFn: async () => {
      const response = await fetch(`/api/articles/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('NOT_FOUND');
        }
        throw new Error('Failed to fetch article');
      }
      return response.json();
    },
    enabled: Boolean(id),
  });

  const {
    mutate: persistNotes,
    isPending: isNotesSaving,
  } = useMutation({
    mutationFn: async (updatedNotes: Note[]) => {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: updatedNotes }),
      });
      if (!response.ok) {
        throw new Error('Failed to save notes');
      }
      return updatedNotes;
    },
    onSuccess: (updatedNotes) => {
      queryClient.setQueryData<Article>(['article', id], (prev) =>
        prev ? { ...prev, notes: updatedNotes, notesCount: updatedNotes.length } : prev
      );
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });

  const {
    mutate: persistTitle,
    isPending: isTitleSaving,
    isError: isTitleError,
    error: titleMutationError,
    reset: resetTitleMutation,
  } = useMutation({
    mutationFn: async (newTitle: string) => {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!response.ok) {
        throw new Error('Failed to update title');
      }
      return newTitle;
    },
    onSuccess: (newTitle) => {
      queryClient.setQueryData<Article>(['article', id], (prev) =>
        prev ? { ...prev, title: newTitle } : prev
      );
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });

  useEffect(() => {
    if (!article) return;
    setNotes(article.notes ?? []);
    setTitleDraft(article.title || article.url || '');
    setIsTitleEditing(false);
    const maxExistingId = (article.notes ?? []).reduce(
      (max, note) => (typeof note.id === 'number' ? Math.max(max, note.id) : max),
      Date.now()
    );
    nextNoteIdRef.current = maxExistingId;
    hasInitializedNotesRef.current = false;
  }, [article]);

  useEffect(() => {
    if (!article || !id) return;
    const trimmedDraft = titleDraft.trim();
    const currentTitle = (article.title || '').trim();
    if (!trimmedDraft || trimmedDraft === currentTitle) return;

    const timeoutId = setTimeout(() => {
      persistTitle(trimmedDraft);
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [titleDraft, article, id, persistTitle]);

  useEffect(() => {
    if (!id || isArticleLoading) return;
    if (!hasInitializedNotesRef.current) {
      hasInitializedNotesRef.current = true;
      return;
    }

    const timeoutId = setTimeout(() => {
      persistNotes(notes);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [notes, id, isArticleLoading, persistNotes]);

  useEffect(() => {
    const updateWidth = () => {
      if (snapshotContainerRef.current) {
        setContentWidth(snapshotContainerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (snapshotContainerRef.current) {
      setContentWidth(snapshotContainerRef.current.clientWidth);
    }
  }, [leftPanelWidth]);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setLeftPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizing = () => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotating || !snapshotContainerRef.current) return;

    const container = snapshotContainerRef.current;
    const rect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    const clickY = e.clientY - rect.top + scrollTop;
    const rawClickX = e.clientX - rect.left + scrollLeft;
    const boundedCenterX = Math.max(
      NOTE_MARKER_RADIUS,
      Math.min(rawClickX, rect.width - NOTE_MARKER_RADIUS)
    );

    nextNoteIdRef.current += 1;
    const newNote: Note = {
      id: nextNoteIdRef.current,
      text: "",
      top: clickY,
      left: boundedCenterX,
    };

    setNotes((prev) => [...prev, newNote]);
    setIsAnnotating(false);
  }, [isAnnotating, snapshotContainerRef]);

  const handleNoteChange = useCallback((id: number, text: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, text } : n))
    );
  }, []);

  const handleDeleteNote = useCallback((id: number) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const scrollToNote = useCallback((top: number) => {
    if (snapshotContainerRef.current) {
      snapshotContainerRef.current.scrollTo({
        top: top - 100, // Offset for visibility
        behavior: "smooth",
      });
    }
  }, [snapshotContainerRef]);

  const updateSettings = (newSettings: Partial<ReaderSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const handleTitleBlur = () => {
    if (!titleDraft.trim() && article?.url) {
      setTitleDraft(article.url);
    }
    setIsTitleEditing(false);
  };

  const titleErrorMessage = titleMutationError instanceof Error
    ? titleMutationError.message
    : 'Failed to save title';

  if (isArticleLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading article...</p>
        </div>
      </div>
    );
  }

  if (articleError && !article) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-900 text-gray-200 gap-4">
        <p>{articleError.message === 'NOT_FOUND' ? 'Document not found.' : 'Failed to load article.'}</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition"
        >
          Back to Library
        </button>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="flex h-screen bg-gray-900 font-sans overflow-hidden">
      {/* LEFT PANEL: Website Content */}
      <div
        className="h-full flex flex-col bg-gray-900 relative"
        style={{ width: `${leftPanelWidth}%` }}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-gray-900 z-10 shadow-sm flex flex-wrap items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 transition-colors"
            title="Back to Library"
          >
            ←
          </button>

          <div className="flex-1 min-w-[220px]">
            {isTitleEditing ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => {
                  resetTitleMutation();
                  setTitleDraft(e.target.value);
                }}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setTitleDraft(article?.title || article?.url || '');
                    setIsTitleEditing(false);
                  }
                }}
                placeholder={article?.title || article?.url || "Untitled article"}
                maxLength={120}
                autoFocus
                className="w-full bg-transparent text-2xl font-semibold text-white border-b border-blue-500 focus:outline-none pb-1 transition-colors"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsTitleEditing(true)}
                className="w-full text-left group"
                title="Click to edit title"
              >
                <h1 className="text-2xl font-semibold text-white group-hover:text-blue-300 transition-colors leading-snug">
                  {titleDraft.trim() || article?.title || article?.url || "Untitled article"}
                </h1>
                <p className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  Click to edit title
                </p>
              </button>
            )}
            <div className="text-xs text-gray-500 h-4 mt-1">
              {isTitleError ? (
                <span className="text-red-400">{titleErrorMessage}</span>
              ) : isTitleSaving ? (
                <span className="text-yellow-400">Saving title...</span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <AppearanceToolbar settings={settings} onUpdate={updateSettings} />
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${isNotesSaving ? 'bg-yellow-900/30 text-yellow-500' : 'bg-green-900/30 text-green-500'}`}>
              {isNotesSaving ? 'Saving...' : 'Saved'}
            </span>

            <button
              onClick={() => setIsAnnotating(!isAnnotating)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${isAnnotating
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-transparent"
                }`}
            >
              {isAnnotating ? "Click to Place Note" : "+ Add Note"}
            </button>
          </div>
        </div>

        {/* Article Content */}
        <div
          ref={snapshotContainerRef}
          className={`flex-grow overflow-y-auto relative scroll-smooth ${isAnnotating ? 'cursor-crosshair' : ''} ${getThemeClasses(settings.theme)}`}
          onClick={handleContentClick}
        >
          <div className="relative min-h-full">
            <ReaderView
              content={article.content}
              title={article.title}
              byline={article.byline}
              settings={settings}
            />

            {/* Note Markers */}
            {notes.map((note, index) => (
              <div
                key={note.id}
                className={`absolute w-8 h-8 bg-yellow-500 rounded-full shadow-md flex items-center justify-center text-yellow-900 font-bold text-xs border-2 border-gray-900 cursor-pointer hover:scale-110 transition-transform z-20 transform -translate-x-1/2 ${
                  contentWidth > 0 && Math.abs((note.left ?? NOTE_MARKER_RADIUS) - contentWidth / 2) <= contentWidth * (BLURRED_ZONE_PERCENT / 2)
                    ? 'blur-[1px]'
                    : ''
                }`}
                style={{
                  top: note.top,
                  left: note.left ?? NOTE_MARKER_RADIUS,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToNote(note.top);
                }}
              >
                {index + 1}
              </div>
            ))}

            {/* Annotation Overlay */}
            {isAnnotating && (
              <div className="absolute inset-0 bg-blue-500/10 z-10 pointer-events-none" />
            )}
          </div>
        </div>
      </div>

      {/* RESIZER */}
      <div
        className="w-1 bg-gray-800 hover:bg-blue-500 cursor-col-resize transition-colors z-30 flex items-center justify-center relative group"
        onMouseDown={startResizing}
      >
        <div className="absolute inset-y-0 -left-2 -right-2 z-30" />
        <div className="w-1 h-8 bg-gray-600 rounded-full group-hover:bg-white" />
      </div>

      {/* RIGHT PANEL: Notes */}
      <div
        className="h-full bg-gray-900 flex flex-col shadow-xl z-20 border-l border-gray-800"
        style={{ width: `${100 - leftPanelWidth}%` }}
      >
        <div className="p-4 border-b border-gray-800 bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-100">Notes</h2>
          <p className="text-sm text-gray-500">{notes.length} notes added</p>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {notes.length === 0 && (
            <div className="text-center text-gray-500 mt-10">
              <p>No notes yet.</p>
              <p className="text-sm">Click "+ Add Note" and select an area on the left.</p>
            </div>
          )}

          {notes.map((note, index) => (
            <NoteCard
              key={note.id}
              note={note}
              index={index}
              onScrollTo={scrollToNote}
              onDelete={handleDeleteNote}
              onChange={handleNoteChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface NoteCardProps {
  note: Note;
  index: number;
  onScrollTo: (top: number) => void;
  onDelete: (id: number) => void;
  onChange: (id: number, text: string) => void;
}

const NoteCard = memo(({ note, index, onScrollTo, onDelete, onChange }: NoteCardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div
      className="bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-700 hover:border-gray-600 transition-colors group"
      onClick={() => onScrollTo(note.top)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-gray-400 bg-gray-900/50 px-2 py-1 rounded flex items-center gap-2">
          <span className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] text-yellow-900 font-bold">
            {index + 1}
          </span>
          {Math.round(note.top)}px • X: {Math.round(note.left ?? NOTE_MARKER_RADIUS)}px
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Delete
        </button>
      </div>
      {isEditing ? (
        <textarea
          value={note.text}
          onChange={(e) => onChange(note.id, e.target.value)}
          placeholder="Write your observation..."
          rows={3}
          autoFocus
          className="w-full p-3 text-gray-200 bg-gray-900/60 resize-none focus:outline-none rounded-md transition-colors placeholder-gray-600 min-h-[120px]"
          onClick={(e) => e.stopPropagation()}
          onBlur={() => setIsEditing(false)}
        />
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="w-full text-left bg-gray-900/30 hover:bg-gray-900/60 transition-colors rounded-md p-3"
        >
          <p className={`text-sm whitespace-pre-line overflow-hidden max-h-[4.5rem] ${note.text ? 'text-gray-200' : 'text-gray-500 italic'}`}>
            {note.text || "Click to write your observation..."}
          </p>
        </button>
      )}
    </div>
  );
});
NoteCard.displayName = "NoteCard";
