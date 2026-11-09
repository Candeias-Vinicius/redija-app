import React, { useCallback } from 'react';
import { GoogleUserProfile } from '@/core/auth/GoogleAuthContext';
import { deleteProject, listProjects } from '@/core/storage/db';
import { deleteAllUserDriveProjects } from '@/core/storage/googleDriveService';

const GUEST_MODE_STORAGE_KEY = 'redija:guestMode';

export function readInitialGuestMode(): boolean {
  try {
    return (
      sessionStorage.getItem(GUEST_MODE_STORAGE_KEY) === 'true' ||
      localStorage.getItem(GUEST_MODE_STORAGE_KEY) === 'true'
    );
  } catch {
    return false;
  }
}

export function persistGuestMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(GUEST_MODE_STORAGE_KEY, 'true');
      sessionStorage.setItem(GUEST_MODE_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
      sessionStorage.removeItem(GUEST_MODE_STORAGE_KEY);
    }
  } catch {
    // Ignora caso storage esteja bloqueado
  }
}

interface UseAuthSessionOptions {
  user: GoogleUserProfile | null;
  isConfigured: boolean;
  login: (promptConsent?: boolean) => Promise<string | null>;
  loginDevMock: () => void;
  logout: () => void;
  revokeAccess: () => Promise<void>;
  getValidAccessToken: (interactive?: boolean) => Promise<string | null>;
  setIsGuestMode: React.Dispatch<React.SetStateAction<boolean>>;
  onResetWorkspace: () => void;
}

export function useAuthSession({
  user,
  isConfigured,
  login,
  loginDevMock,
  logout,
  revokeAccess,
  getValidAccessToken,
  setIsGuestMode,
  onResetWorkspace,
}: UseAuthSessionOptions) {
  const clearGuestMode = useCallback(() => {
    setIsGuestMode(false);
    persistGuestMode(false);
  }, [setIsGuestMode]);

  const handleEnterGuestMode = useCallback(() => {
    setIsGuestMode(true);
    persistGuestMode(true);
  }, [setIsGuestMode]);

  const handleLoginClick = useCallback(async (): Promise<string | null> => {
    let token: string | null;
    if (!isConfigured) {
      loginDevMock();
      token = 'mock_dev_token_xyz';
    } else {
      token = await login(false);
    }
    if (token) {
      clearGuestMode();
    }
    return token;
  }, [isConfigured, loginDevMock, login, clearGuestMode]);

  const handleLogout = useCallback(() => {
    logout();
    clearGuestMode();
    onResetWorkspace();
  }, [logout, clearGuestMode, onResetWorkspace]);

  const handleExitGuestMode = useCallback(() => {
    clearGuestMode();
    onResetWorkspace();
  }, [clearGuestMode, onResetWorkspace]);

  const handleRevokeAccess = useCallback(async () => {
    await revokeAccess();
    clearGuestMode();
    onResetWorkspace();
  }, [revokeAccess, clearGuestMode, onResetWorkspace]);

  const handleDeleteAccountAndData = useCallback(async () => {
    try {
      const token = await getValidAccessToken(true);
      if (token) {
        await deleteAllUserDriveProjects(token);
      }
    } catch (err) {
      console.warn('Erro ao deletar arquivos do Google Drive:', err);
    }

    try {
      if (user?.email) {
        const userProjects = await listProjects(user.email);
        for (const p of userProjects) {
          await deleteProject(p.id);
        }
      }
      onResetWorkspace();
    } catch (err) {
      console.warn('Erro ao limpar cache local na exclusão:', err);
    }

    await revokeAccess();
    clearGuestMode();
  }, [getValidAccessToken, user, onResetWorkspace, revokeAccess, clearGuestMode]);

  return {
    handleEnterGuestMode,
    handleLoginClick,
    handleLogout,
    handleExitGuestMode,
    handleRevokeAccess,
    handleDeleteAccountAndData,
  };
}
