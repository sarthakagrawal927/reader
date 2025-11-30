'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { formatDate } from '../lib/utils';
import { ArticleSummary, ArticleStatus, Project } from '../types';

export default function HomeClient() {
  const [url, setUrl] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeToolbarId, setActiveToolbarId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [newProjectName, setNewProjectName] = useState('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

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

  const {
    data: projects = [],
    isLoading: isProjectsLoading,
    error: projectsError,
  } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
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
        throw new Error(errorData.error || 'Failed to fetch article content');
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
          projectId: selectedProjectId === 'all' ? undefined : selectedProjectId,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save article');
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
        throw new Error('Failed to delete article');
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
      setUrl('');
      router.push(`/reader/${newArticleId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import article';
      console.error(error);
      alert(message);
    }
  };

  const isImporting = importMutation.isPending;

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ArticleStatus }) => {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      return { id, status };
    },
    onSuccess: ({ id, status }) => {
      queryClient.setQueryData<ArticleSummary[]>(['articles'], (prev) =>
        Array.isArray(prev)
          ? prev.map((article) => (article.id === id ? { ...article, status } : article))
          : prev
      );
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
    },
    onSuccess: () => {
      setNewProjectName('');
      setIsProjectModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setSelectedProjectId('all');
    },
  });

  const moveProjectMutation = useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const response = await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!response.ok) {
        throw new Error('Failed to move article');
      }
      return { id, projectId };
    },
    onSuccess: ({ id, projectId }) => {
      queryClient.setQueryData<ArticleSummary[]>(['articles'], (prev) =>
        Array.isArray(prev)
          ? prev.map((article) =>
              article.id === id
                ? {
                    ...article,
                    projectId,
                  }
                : article
            )
          : prev
      );
    },
  });

  const handleDelete = async (articleId: string) => {
    setDeletingId(articleId);
    setPendingDeleteId(null);
    setActiveToolbarId(null);
    try {
      await deleteMutation.mutateAsync(articleId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete article';
      console.error(error);
      alert(message);
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

  const filteredArticles =
    selectedProjectId === 'all'
      ? articles
      : articles.filter((article) => article.projectId === selectedProjectId);

  const projectOptions = [{ id: 'all', name: 'All projects' }, ...(projects || [])];
  const moveTargets = (projects || []).filter((p) => p.id !== 'all');

  return (
    <div className="min-h-screen bg-gray-900 p-8 font-sans text-gray-100">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My Library</h1>
            <p className="text-gray-400 mt-1">Manage your annotated articles</p>
          </div>

          <div className="w-full md:w-auto bg-gray-800/80 border border-gray-700 rounded-xl p-3 shadow-inner">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs uppercase tracking-wide text-gray-500">Project</label>
              <div className="relative">
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="appearance-none bg-gray-900/80 border border-gray-600 text-white text-sm rounded-lg px-4 py-2 pr-8 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isProjectsLoading}
                >
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  ▾
                </span>
              </div>
              {projectsError && (
                <span className="text-xs text-red-400">Failed to load projects</span>
              )}
              <button
                type="button"
                onClick={() => setIsProjectModalOpen(true)}
                className="px-3 py-2 text-sm bg-blue-600 rounded-lg text-white hover:bg-blue-700 shadow-sm"
              >
                + New
              </button>
              {selectedProjectId !== 'all' && selectedProjectId !== 'default' && (
                <button
                  type="button"
                  onClick={() => deleteProjectMutation.mutate(selectedProjectId)}
                  className="px-3 py-2 text-sm bg-red-600 rounded-lg text-white disabled:bg-red-800 shadow-sm"
                  disabled={deleteProjectMutation.isPending}
                >
                  {deleteProjectMutation.isPending ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Add New Article</h2>
          <form onSubmit={handleImport} className="flex flex-col gap-4 md:flex-row">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter website URL (e.g. https://example.com/article)"
              className="flex-grow px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white placeholder-gray-500"
              disabled={isImporting}
            />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-3 md:w-52 shadow-inner"
            >
              {projectOptions
                .filter((project) => project.id !== 'all')
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
            </select>
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
              filteredArticles.map((article) => {
                const projectName =
                  projects.find((project) => project.id === article.projectId)?.name || 'Default';
                const nextStatus: ArticleStatus =
                  article.status === 'read' ? 'in_progress' : 'read';
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
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-300">
                            <span className="px-2 py-1 bg-gray-900 border border-gray-700 rounded-full">
                              {projectName}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStatus.mutate({ id: article.id, status: nextStatus });
                              }}
                              className={`px-2 py-1 rounded-full border text-xs ${
                                article.status === 'read'
                                  ? 'bg-green-900/40 border-green-700 text-green-300'
                                  : 'bg-yellow-900/40 border-yellow-700 text-yellow-300'
                              }`}
                            >
                              {article.status === 'read' ? 'Read' : 'In Progress'}
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            className="p-2 rounded-full"
                            aria-label="Open article actions"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveToolbarId((prev) =>
                                prev === article.id ? null : article.id
                              );
                            }}
                          >
                            ⋮
                          </button>
                          {activeToolbarId === article.id && (
                            <div
                              className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-700 bg-gray-900 shadow-lg z-30 p-3 space-y-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-blue-200 hover:text-white hover:bg-gray-800 disabled:opacity-50 border border-gray-800"
                                onClick={() =>
                                  toggleStatus.mutate({ id: article.id, status: nextStatus })
                                }
                              >
                                {article.status === 'read' ? 'Mark In Progress' : 'Mark Read'}
                              </button>
                              <div className="space-y-1">
                                <label className="text-xs text-gray-500 px-1">Move to</label>
                                <div className="relative">
                                  <select
                                    className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-2 py-2 pr-7"
                                    value={article.projectId || 'default'}
                                    onChange={(e) =>
                                      moveProjectMutation.mutate({
                                        id: article.id,
                                        projectId: e.target.value,
                                      })
                                    }
                                  >
                                    {moveTargets.map((project) => (
                                      <option key={project.id} value={project.id}>
                                        {project.name}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                                    ▾
                                  </span>
                                </div>
                              </div>
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
                        <p
                          className="text-sm text-gray-500 italic line-clamp-1"
                          title={article.byline}
                        >
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
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeDeleteModal}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Delete article?</h3>
              <p className="text-sm text-gray-400 mt-2">
                {articlePendingDelete.title || articlePendingDelete.url}
              </p>
            </div>
            <p className="text-sm text-gray-500">
              This removes the article and all of its notes permanently. This action cannot be
              undone.
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

      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsProjectModalOpen(false)}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Create project</h3>
              <p className="text-sm text-gray-400 mt-2">Organize your articles into a project.</p>
            </div>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!newProjectName.trim() || createProjectMutation.isPending) return;
                createProjectMutation.mutate(newProjectName.trim());
              }}
            >
              <div>
                <label className="text-sm text-gray-400 block mb-2">Project name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Research, Inspiration"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-gray-200 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white disabled:bg-blue-800"
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
