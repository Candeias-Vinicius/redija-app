// Controle do aviso "seus trabalhos estão salvos apenas neste navegador".
const DISMISS_KEY = 'redija:dismissBackupNoticeUntil';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function isBackupNoticeDismissed(): boolean {
  try {
    const dismissUntil = localStorage.getItem(DISMISS_KEY);
    return Boolean(dismissUntil && Number(dismissUntil) > Date.now());
  } catch {
    return false;
  }
}

export function dismissBackupNotice(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + SEVEN_DAYS_MS));
  } catch {
    // Ignora restrições de localStorage
  }
}
