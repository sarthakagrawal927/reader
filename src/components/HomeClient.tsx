"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatDate } from "../lib/utils";
import { ArticleSummary } from "../types";

export default function HomeClient() {
  const [url, setUrl] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeToolbarId, setActiveToolbarId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: articles = [],
    isLoading,
    error: articlesError,
  } = useQuery<ArticleSummary[]>({
    queryKey: ['articles'],
    queryFn: async () => {
      const response = await fetch('/api/articles', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      return response.json();
    },
  });

  const importMutation = useMutation({
    mutationFn: async (rawUrl: string) => {
      let properUrl = rawUrl;
      if (!/^https?:\/\//i.test(rawUrl)) {
        properUrl = `https://${rawUrl}`;
      }

      const response = await fetch(`/api/snapshot?url=${encodeURIComponent(properUrl)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch article content");
      }

      const data = await response.json();
      const article = data.snapshot;
      const snapshotTitle = (article.title || '').trim() || properUrl;

      const saveResponse = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: properUrl,
          title: snapshotTitle,
          byline: article.byline,
          content: article.content,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save article");
      }

      const savedData = await saveResponse.json();
      return savedData.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (articleId: string) => {
      const response = await fetch(`/api/articles/${articleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error("Failed to delete article");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url || importMutation.isPending) return;

    try {
      const newArticleId = await importMutation.mutateAsync(url);
      setUrl("");
      router.push(`/reader/${newArticleId}`);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to import article");
    }
  };

  const isImporting = importMutation.isPending;

  const handleDelete = async (articleId: string) => {
    setDeletingId(articleId);
    setPendingDeleteId(null);
    setActiveToolbarId(null);
    try {
      await deleteMutation.mutateAsync(articleId);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to delete article");
    }
  };

  useEffect(() => {
    if (!activeToolbarId) return;
    const closeMenu = () => setActiveToolbarId(null);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [activeToolbarId]);

  const articlePendingDelete = pendingDeleteId
    ? articles.find((article) => article.id === pendingDeleteId)
    : null;

  const closeDeleteModal = () => {
    if (deletingId) return;
    setPendingDeleteId(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8 font-sans text-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My Library</h1>
            <p className="text-gray-400 mt-1">Manage your annotated articles</p>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Add New Article</h2>
          <form onSubmit={handleImport} className="flex gap-4">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL (e.g. https://example.com/article)"
              className="flex-grow px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-gray-500"
              disabled={isImporting}
            />
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-800 disabled:text-gray-400 transition-colors flex items-center gap-2 whitespace-nowrap"
              disabled={isImporting}
            >
              {isImporting ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Importing...
                </>
              ) : (
                <>
                  <span>+</span> Import
                </>
              )}
            </button>
          </form>
        </div>

        {articlesError && (
          <div className="bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded-lg mb-6">
            Failed to load articles. Please try again.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.length === 0 ? (
              <div className="col-span-full text-center py-16 bg-gray-800 rounded-2xl border border-gray-700 border-dashed">
                <p className="text-gray-300 text-lg mb-4">Your library is empty.</p>
                <p className="text-gray-500">Enter a URL above to get started.</p>
              </div>
            ) : (
              articles.map((article) => {
                const displayTitle = article.title || article.url;
                return (
                  <div
                    key={article.id}
                    onClick={() => router.push(`/reader/${article.id}`)}
                    className="group relative bg-gray-800 rounded-xl border border-gray-700 shadow-sm hover:shadow-md hover:border-blue-500 cursor-pointer transition-all overflow-hidden flex flex-col h-full"
                  >
                    <div className="p-6 flex-1 flex flex-col gap-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 pr-2 min-w-0">
                          <h2
                            className="text-xl font-semibold text-white line-clamp-2 break-words pr-6 group-hover:text-blue-400 transition-colors"
                            title={displayTitle}
                          >
                            {displayTitle}
                          </h2>
                          <p className="text-sm text-gray-400 truncate" title={article.url}>
                            {article.url}
                          </p>
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            className="p-2 rounded-full bg-gray-700/40 text-gray-300 hover:text-white hover:bg-gray-600 transition-all shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                            aria-label="Open article actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveToolbarId((prev) => (prev === article.id ? null : article.id));
                            }}
                          >
                            ⋮
                          </button>
                          {activeToolbarId === article.id && (
                            <div
                              className="absolute right-0 mt-2 w-36 rounded-xl border border-gray-700 bg-gray-900 shadow-lg z-20 p-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:text-red-200 hover:bg-gray-800 disabled:opacity-50"
                                onClick={() => {
                                  if (deletingId) return;
                                  setPendingDeleteId(article.id);
                                  setActiveToolbarId(null);
                                }}
                                disabled={deletingId === article.id}
                              >
                                <span>🗑️</span> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      {article.byline && (
                        <p className="text-sm text-gray-500 italic line-clamp-1" title={article.byline}>
                          By {article.byline}
                        </p>
                      )}
                    </div>
                    <div className="px-6 py-4 bg-gray-900/60 border-t border-gray-700 flex flex-wrap items-center gap-3 justify-between text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        {article.notesCount} notes
                      </span>
                      <span>{formatDate(article.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {articlePendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDeleteModal} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Delete article?</h3>
              <p className="text-sm text-gray-400 mt-2">
                {articlePendingDelete.title || articlePendingDelete.url}
              </p>
            </div>
            <p className="text-sm text-gray-500">
              This removes the article and all of its notes permanently. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-800 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(articlePendingDelete.id)}
                disabled={deletingId === articlePendingDelete.id}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition disabled:opacity-40 flex items-center gap-2"
              >
                {deletingId === articlePendingDelete.id ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
