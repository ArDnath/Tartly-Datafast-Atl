'use client';

import { useEffect, useState } from 'react';
import { useWorkspacesQuery } from './queries/useWorkspacesQuery';

const COOKIE_NAME = 'rl_workspace';
const CHANGE_EVENT = 'rl-workspace-change';

function readCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));

  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(workspaceId: string | null) {
  if (typeof document === 'undefined') {
    return;
  }

  // biome-ignore lint/suspicious/noDocumentCookie: active workspace is a UI scope, never an authorization boundary.
  document.cookie = workspaceId
    ? `${COOKIE_NAME}=${encodeURIComponent(workspaceId)}; path=/; max-age=31536000; samesite=lax`
    : `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

function notify() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * The active workspace is a UI scope, never an authorization boundary. Every
 * API call re-checks membership. The cookie only narrows what the user sees.
 */
export function useActiveWorkspace() {
  const { data: workspaces = [], isLoading } = useWorkspacesQuery();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const stored = readCookie();
      const valid = stored && workspaces.some(workspace => workspace.id === stored);

      if (stored && !valid && !isLoading) {
        writeCookie(null);
        setWorkspaceId(null);
        return;
      }

      setWorkspaceId(valid ? stored : null);
    };

    sync();
    window.addEventListener(CHANGE_EVENT, sync);

    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [isLoading, workspaces]);

  const save = (nextWorkspaceId: string | null) => {
    writeCookie(nextWorkspaceId);
    setWorkspaceId(nextWorkspaceId);
    notify();
  };

  // With exactly one workspace, "all" and "that workspace" are identical. Use
  // it implicitly so creation and queries are still explicitly scoped.
  const effectiveWorkspaceId = workspaceId || (workspaces.length === 1 ? workspaces[0].id : null);
  const activeWorkspace =
    workspaces.find(workspace => workspace.id === effectiveWorkspaceId) || null;

  return {
    activeWorkspace,
    workspaceId: effectiveWorkspaceId,
    workspaces,
    isLoading,
    save,
  };
}
