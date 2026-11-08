import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  USER_PROFILE_STORAGE_KEY,
  ACCESS_TOKEN_STORAGE_KEY,
  TOKEN_EXPIRES_AT_STORAGE_KEY,
  GoogleUserProfile,
} from '../GoogleAuthContext';

describe('GoogleAuthContext: Chaves de Armazenamento e Lógica de Persistência de Sessão', () => {
  const mockLocalStorage: Record<string, string> = {};

  beforeEach(() => {
    for (const key in mockLocalStorage) {
      delete mockLocalStorage[key];
    }

    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockLocalStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = String(value);
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key];
      },
      clear: () => {
        for (const key in mockLocalStorage) {
          delete mockLocalStorage[key];
        }
      },
    });
  });

  it('possui constantes corretas para sincronização de sessão', () => {
    expect(USER_PROFILE_STORAGE_KEY).toBe('redija:userProfile');
    expect(ACCESS_TOKEN_STORAGE_KEY).toBe('redija:accessToken');
    expect(TOKEN_EXPIRES_AT_STORAGE_KEY).toBe('redija:tokenExpiresAt');
  });

  it('grava e recupera perfil de usuário no localStorage', () => {
    const user: GoogleUserProfile = {
      id: 'sub_123',
      name: 'Pesquisador ABNT',
      email: 'pesquisador@usp.br',
      picture: 'https://lh3.googleusercontent.com/avatar',
    };

    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(user));
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.email).toBe('pesquisador@usp.br');
  });

  it('grava token e expiração com margem de segurança', () => {
    const token = 'ya29.test_token';
    const expiresIn = 3600;
    const expiresAt = Date.now() + expiresIn * 1000;

    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRES_AT_STORAGE_KEY, String(expiresAt));

    const storedToken = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
    const storedExpiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_STORAGE_KEY));

    expect(storedToken).toBe(token);
    expect(storedExpiresAt).toBeGreaterThan(Date.now() + 60_000);
  });

  it('detecta tokens expirados no storage', () => {
    const token = 'ya29.expired_token';
    // Expirou há 10 segundos
    const expiresAt = Date.now() - 10_000;

    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRES_AT_STORAGE_KEY, String(expiresAt));

    const storedExpiresAt = Number(localStorage.getItem(TOKEN_EXPIRES_AT_STORAGE_KEY));
    const isValid = storedExpiresAt > Date.now() + 60_000;

    expect(isValid).toBe(false);
  });

  it('remove todas as credenciais no logout', () => {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, '{"id":"1"}');
    localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'token123');
    localStorage.setItem(TOKEN_EXPIRES_AT_STORAGE_KEY, '123456');

    localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_AT_STORAGE_KEY);

    expect(localStorage.getItem(USER_PROFILE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_EXPIRES_AT_STORAGE_KEY)).toBeNull();
  });
});
