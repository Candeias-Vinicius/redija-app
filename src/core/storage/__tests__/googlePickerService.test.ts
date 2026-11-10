import { describe, it, expect } from 'vitest';
import {
  getGooglePickerConfig,
  openDriveFilePicker,
  PickerNotConfiguredError,
} from '../googlePickerService';

describe('googlePickerService (Escopo estrito drive.file + Picker API)', () => {
  it('interpreta configuração do ambiente e ignora placeholders inválidos', () => {
    const emptyCfg = getGooglePickerConfig({
      VITE_GOOGLE_API_KEY: 'sua_api_key_aqui',
      VITE_GOOGLE_CLIENT_ID: '123456789012-abc.apps.googleusercontent.com',
    });
    expect(emptyCfg.isConfigured).toBe(false);
    expect(emptyCfg.apiKey).toBe('');
    expect(emptyCfg.appId).toBe('123456789012');

    const configured = getGooglePickerConfig({
      VITE_GOOGLE_API_KEY: 'AIzaRealTestKey12345',
      VITE_GOOGLE_CLIENT_ID: '998877665544-xyz.apps.googleusercontent.com',
    });
    expect(configured.isConfigured).toBe(true);
    expect(configured.apiKey).toBe('AIzaRealTestKey12345');
    expect(configured.appId).toBe('998877665544');

    const explicitAppId = getGooglePickerConfig({
      VITE_GOOGLE_API_KEY: 'AIzaRealTestKey12345',
      VITE_GOOGLE_APP_ID: '555666777888',
      VITE_GOOGLE_CLIENT_ID: '111222-xyz.apps.googleusercontent.com',
    });
    expect(explicitAppId.appId).toBe('555666777888');
  });

  it('recusa abrir Google Picker em token demo/mock com erro explicativo', async () => {
    await expect(openDriveFilePicker('mock_dev_token_123')).rejects.toThrow(
      PickerNotConfiguredError,
    );
  });
});
