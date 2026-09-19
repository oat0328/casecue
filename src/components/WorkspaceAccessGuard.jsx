import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getActiveWorkspace, getUserWorkspaces, workspaceHome, WORKSPACES } from '@/lib/workspaces';

const SPED_PREFIXES = [
  '/app','/students','/instruction','/attendance','/gradebook','/ieps','/progress',
  '/communication','/notes','/reports','/meetings-workspace','/progress-reports',
  '/command-center','/studio-workspace','/lesson-studio','/sub-plans','/smart-gradebook',
  '/schedule','/iep-studio','/iep-workspace','/documents','/behavior-studio','/iep-review',
  '/data-center','/session-tracker','/progress-monitoring-day','/goal-groups','/evidence-vault',
  '/meetings','/meeting-navigator'
];

function requiredWorkspace(pathname='') {
  const workspaceMatch = String(pathname).match(/^\/w\/([^/]+)/);
  if (workspaceMatch && WORKSPACES[workspaceMatch[1]]) return workspaceMatch[1];
  if (SPED_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))) return 'sped';
  return null;
}

export default function WorkspaceAccessGuard({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const allowed = getUserWorkspaces(user);
  const required = requiredWorkspace(location.pathname);

  if (required && !allowed.includes(required)) {
    const active = getActiveWorkspace(user);
    return <Navigate to={workspaceHome(active)} replace state={{ workspaceAccessDenied: required }} />;
  }

  return children;
}
