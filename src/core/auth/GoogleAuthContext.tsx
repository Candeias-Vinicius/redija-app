// =====================================================================
// RedijaApp — Contexto de Autenticação Google Identity Services (GIS)
// Arquitetura de Sessão: Token persistido com controle de expiração (1 hora)
// Sem popups intrusivos em F5 ou auto-save, preservando sessão e Drive Sync
// =====================================================================

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const FULL_AUTH_SCOPE = `openid email profile ${GOOGLE_DRIVE_SCOPE}`;

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
}

interface GoogleAuthContextValue {
  user: GoogleUserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;
  login: (promptConsent?: boolean) => Promise<string | null>;
  loginDevMock: () => void;
  logout: () => void;
  revokeAccess: () => Promise<void>;
  getValidAccessToken: (interactive?: boolean) => Promise<string | null>;
  clearError: () => void;
}

const GoogleAuthContext = createContext<GoogleAuthContextValue | undefined>(undefined);

export const USER_PROFILE_STORAGE_KEY = 'redija:userProfile';
export const ACCESS_TOKEN_STORAGE_KEY = 'redija:accessToken';
export const TOKEN_EXPIRES_AT_STORAGE_KEY = 'redija:tokenExpiresAt';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/**
 * Lê o token de acesso persistido e valida se ainda está no período de validade
 * com margem de segurança de 60 segundos antes da expiração.
 */
function getStoredTokenData(): { token: string | null; expiresAt: number } {
  try {
    const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    const expiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_STORAGE_KEY) || 0);
    if (token && expiresAt > Date.now() + 60_000) {
      return { token, expiresAt };
    }
    return { token: null, expiresAt: 0 };
  } catch {
    return { token: null, expiresAt: 0 };
  }
}

export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Token persistido e mantido em sincronia com o localStorage.
  // Permite recargas de página (F5) sem perder a sessão e sem disparar popups de login.
  const initialTokenData = getStoredTokenData();
  const accessTokenRef = useRef<string | null>(initialTokenData.token);
  const tokenExpiresAtRef = useRef<number>(initialTokenData.expiresAt);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = Boolean(
    GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('seu_client_id_aqui')
  );

  const clearError = () => setError(null);

  /**
   * Atualiza ou remove o token e sua expiração em memória e no localStorage.
   */
  const saveToken = useCallback((token: string | null, expiresInSeconds = 0) => {
    accessTokenRef.current = token;
    if (token && expiresInSeconds > 0) {
      const expiresAt = Date.now() + expiresInSeconds * 1000;
      tokenExpiresAtRef.current = expiresAt;
      try {
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
        localStorage.setItem(TOKEN_EXPIRES_AT_STORAGE_KEY, String(expiresAt));
      } catch {
        // Ignora falha de localStorage
      }
    } else {
      tokenExpiresAtRef.current = 0;
      try {
        localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        localStorage.removeItem(TOKEN_EXPIRES_AT_STORAGE_KEY);
      } catch {
        // Ignora falha de localStorage
      }
    }
  }, []);

  /**
   * Busca os dados do perfil público do usuário com o token de acesso.
   */
  const fetchUserInfo = async (token: string): Promise<GoogleUserProfile> => {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('Falha ao obter informações do perfil Google.');
    }
    const data = await res.json();
    return {
      id: data.sub,
      email: data.email,
      name: data.name || data.email,
      picture: data.picture || '',
    };
  };

  /**
   * Solicita um novo Access Token via Google Identity Services TokenClient.
   * Se promptMode for '' (vazio), o Google solicita permissões APENAS na primeira vez
   * que o usuário conectar; em logins subsequentes, conecta direto sem re-pedir permissões.
   */
  const requestTokenFromGoogle = useCallback(
    (promptMode = '', userHint?: string): Promise<{ token: string; expiresIn: number }> => {
      return new Promise((resolve, reject) => {
        if (!isConfigured) {
          return reject(
            new Error(
              'VITE_GOOGLE_CLIENT_ID não configurado. Adicione suas credenciais no arquivo .env.'
            )
          );
        }

        if (!window.google?.accounts?.oauth2) {
          return reject(
            new Error(
              'O SDK do Google Identity Services ainda não foi carregado. Verifique sua conexão.'
            )
          );
        }

        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: FULL_AUTH_SCOPE,
          prompt: promptMode,
          hint: userHint || undefined,
          callback: (response) => {
            if (response.error) {
              return reject(new Error(response.error_description || response.error));
            }
            if (!response.access_token) {
              return reject(new Error('Nenhum token retornado pelo Google.'));
            }
            resolve({
              token: response.access_token,
              expiresIn: Number(response.expires_in) || 3599,
            });
          },
          error_callback: (err: unknown) => {
            const msg = err instanceof Error ? err.message : 'Falha na comunicação com o Google.';
            reject(new Error(msg));
          },
        });

        client.requestAccessToken({
          prompt: promptMode,
          hint: userHint || undefined,
        });
      });
    },
    [isConfigured]
  );

  /**
   * Obtém um token de acesso válido:
   * - Retorna o token em memória/storage se ainda estiver válido (>60 segundos restantes).
   * - Caso contrário, se interactive for true (ex: clique explícito do usuário), solicita novo token.
   * - Se interactive for false (ex: auto-save em segundo plano), retorna null sem abrir popups intrusivos.
   */
  const getValidAccessToken = useCallback(
    async (interactive = false): Promise<string | null> => {
      const now = Date.now();
      // Revalida também caso o token tenha sido renovado em outra aba
      if (!accessTokenRef.current || tokenExpiresAtRef.current <= now + 60_000) {
        const stored = getStoredTokenData();
        if (stored.token) {
          accessTokenRef.current = stored.token;
          tokenExpiresAtRef.current = stored.expiresAt;
        }
      }

      if (accessTokenRef.current && tokenExpiresAtRef.current > now + 60_000) {
        return accessTokenRef.current;
      }

      // Se expirou e é uma chamada interativa disparada pelo usuário, renova via popup do Google
      if (user && interactive) {
        try {
          const { token, expiresIn } = await requestTokenFromGoogle('', user.email);
          saveToken(token, expiresIn);
          return token;
        } catch (err: unknown) {
          console.warn('Renovação de token cancelada ou expirada:', err);
          return null;
        }
      }

      return null;
    },
    [user, requestTokenFromGoogle, saveToken]
  );

  /**
   * Dispara o fluxo de Login do Google.
   */
  const login = useCallback(
    async (promptConsent = false): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Documentação Google Identity Services (GIS):
        // prompt: '' (vazio) -> O usuário só recebe o popup de concessão de permissões
        // na primeira vez. Em logins seguintes, o Google autentica direto sem re-pedir permissões!
        const promptMode = promptConsent ? 'consent' : '';
        const { token, expiresIn } = await requestTokenFromGoogle(promptMode, user?.email);

        saveToken(token, expiresIn);

        const profile = await fetchUserInfo(token);
        setUser(profile);
        try {
          localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
          localStorage.removeItem('redija:guestMode');
          sessionStorage.removeItem('redija:guestMode');
        } catch {
          // Ignora
        }

        return token;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao autenticar com o Google.';
        // Não exibe erro se o usuário apenas fechou a janela de login
        if (!message.includes('popup_closed') && !message.includes('access_denied')) {
          setError(message);
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [requestTokenFromGoogle, saveToken, user?.email]
  );

  /**
   * Modo de teste/desenvolvimento para quando o Google Cloud Client ID ainda não estiver configurado.
   */
  const loginDevMock = useCallback(() => {
    const mockUser: GoogleUserProfile = {
      id: 'dev_mock_user_1',
      name: 'Vinicius Candeias (Dev)',
      email: 'vinicandeias@gmail.com',
      picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    };
    saveToken('mock_dev_token_xyz', 3600);
    setUser(mockUser);
    setError(null);
    try {
      localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(mockUser));
      localStorage.removeItem('redija:guestMode');
      sessionStorage.removeItem('redija:guestMode');
    } catch {
      // Ignora
    }
  }, [saveToken]);

  /**
   * Efetua Logout limpo:
   * - Limpa o token em memória, localStorage e o estado do usuário
   * - Remove metadados da sessão local
   * - NÃO revoga permissões na API do Google (pois revogar deletaria a autorização concedida
   *   fazendo com que o usuário precisasse marcar tudo de novo no próximo login).
   */
  const logout = useCallback(() => {
    if (window.google?.accounts?.id?.disableAutoSelect) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch {
        // Ignora
      }
    }

    saveToken(null);
    setUser(null);
    setError(null);
    try {
      localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
      localStorage.removeItem('redija:guestMode');
      sessionStorage.removeItem('redija:guestMode');
    } catch {
      // Ignora
    }
  }, [saveToken]);

  /**
   * Revoga expressamente todas as permissões concedidas pelo usuário no Google (Desconexão profunda).
   */
  const revokeAccess = useCallback(async (): Promise<void> => {
    try {
      const token = accessTokenRef.current || (await getValidAccessToken(false));
      if (token && typeof window.google?.accounts?.oauth2?.revoke === 'function') {
        await new Promise<void>((resolve) => {
          window.google!.accounts.oauth2.revoke(token, () => {
            resolve();
          });
        });
      }
    } catch (err) {
      console.warn('Erro ao revogar permissões no Google:', err);
    } finally {
      logout();
    }
  }, [getValidAccessToken, logout]);

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        isConfigured,
        error,
        login,
        loginDevMock,
        logout,
        revokeAccess,
        getValidAccessToken,
        clearError,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useGoogleAuth = (): GoogleAuthContextValue => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth deve ser utilizado dentro de um GoogleAuthProvider.');
  }
  return context;
};

