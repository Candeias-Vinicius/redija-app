// =====================================================================
// RedijaApp — Contexto de Autenticação Google Identity Services (GIS)
// Arquitetura de Segurança: Token estritamente em memória (Zero XSS leakage)
// =====================================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

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
  logout: () => void;
  getValidAccessToken: () => Promise<string | null>;
  clearError: () => void;
}

const GoogleAuthContext = createContext<GoogleAuthContextValue | undefined>(undefined);

const USER_PROFILE_STORAGE_KEY = 'redija:userProfile';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Token estritamente em memória RAM da aba — NUNCA no localStorage
  const accessTokenRef = useRef<string | null>(null);
  const tokenExpiresAtRef = useRef<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const isConfigured = Boolean(
    GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes('seu_client_id_aqui')
  );

  const clearError = () => setError(null);

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
   */
  const requestTokenFromGoogle = useCallback(
    (promptMode = ''): Promise<{ token: string; expiresIn: number }> => {
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
          error_callback: (err) => {
            reject(new Error(err?.message || 'Falha na comunicação com o Google.'));
          },
        });

        client.requestAccessToken({ prompt: promptMode });
      });
    },
    [isConfigured]
  );

  /**
   * Obtém um token de acesso válido:
   * - Retorna o token em memória se ainda estiver válido (>60 segundos restantes).
   * - Caso contrário, solicita renovação silenciosa se houver usuário salvo.
   */
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    const now = Date.now();
    // Se ainda temos um token válido em memória com mais de 60s de vida, reusa
    if (accessTokenRef.current && tokenExpiresAtRef.current > now + 60_000) {
      return accessTokenRef.current;
    }

    // Se o usuário já fez login antes, tenta renovação silenciosa sem popup
    if (user) {
      try {
        const { token, expiresIn } = await requestTokenFromGoogle('');
        accessTokenRef.current = token;
        tokenExpiresAtRef.current = Date.now() + expiresIn * 1000;
        return token;
      } catch (err: any) {
        console.warn('Renovação silenciosa de token expirada:', err);
        return null;
      }
    }

    return null;
  }, [user, requestTokenFromGoogle]);

  /**
   * Dispara o fluxo de Login do Google.
   */
  const login = useCallback(
    async (promptConsent = false): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { token, expiresIn } = await requestTokenFromGoogle(
          promptConsent ? 'consent' : 'select_account'
        );

        accessTokenRef.current = token;
        tokenExpiresAtRef.current = Date.now() + expiresIn * 1000;

        const profile = await fetchUserInfo(token);
        setUser(profile);
        localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));

        return token;
      } catch (err: any) {
        const message = err?.message || 'Falha ao autenticar com o Google.';
        // Não exibe erro se o usuário apenas fechou a janela de login
        if (!message.includes('popup_closed') && !message.includes('access_denied')) {
          setError(message);
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [requestTokenFromGoogle]
  );

  /**
   * Efetua Logout limpo:
   * - Revoga o token atual
   * - Limpa referências em memória
   * - Remove metadados do localStorage
   * - Desativa reconexão automática
   */
  const logout = useCallback(() => {
    if (accessTokenRef.current && window.google?.accounts?.oauth2?.revoke) {
      try {
        window.google.accounts.oauth2.revoke(accessTokenRef.current);
      } catch {
        // Falha silenciosa caso o token já seja inválido
      }
    }

    if (window.google?.accounts?.id?.disableAutoSelect) {
      try {
        window.google.accounts.id.disableAutoSelect();
      } catch {
        // Ignora
      }
    }

    accessTokenRef.current = null;
    tokenExpiresAtRef.current = 0;
    setUser(null);
    setError(null);
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
  }, []);

  // Tenta renovação silenciosa inicial em segundo plano ao abrir o app caso haja perfil salvo
  useEffect(() => {
    if (user && isConfigured) {
      getValidAccessToken().catch(() => {
        // Se a sessão expirou no Google, o usuário apenas precisará clicar em Entrar novamente quando quiser
      });
    }
  }, [user, isConfigured, getValidAccessToken]);

  return (
    <GoogleAuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        isConfigured,
        error,
        login,
        logout,
        getValidAccessToken,
        clearError,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
};

export const useGoogleAuth = (): GoogleAuthContextValue => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuth deve ser utilizado dentro de um GoogleAuthProvider.');
  }
  return context;
};
