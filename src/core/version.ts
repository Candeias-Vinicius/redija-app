// =====================================================================
// RedijaApp — Versão e Ciclo de Vida da Aplicação
// SemVer: MAJOR.MINOR.PATCH-PRERELEASE
// =====================================================================

export const APP_VERSION = '0.1.0-beta';
export const APP_STAGE = 'BETA';
export const APP_NAME = 'RedijaApp';

const BETA_NOTICE_KEY = 'redija:beta_notice_dismissed';

export function isBetaNoticeDismissed(): boolean {
  try {
    return localStorage.getItem(BETA_NOTICE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setBetaNoticeDismissed(dismissed: boolean): void {
  try {
    if (dismissed) {
      localStorage.setItem(BETA_NOTICE_KEY, 'true');
    } else {
      localStorage.removeItem(BETA_NOTICE_KEY);
    }
  } catch {
    // Ignora restrições de localStorage em modos anônimos ou sandbox
  }
}
