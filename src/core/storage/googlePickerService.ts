// =====================================================================
// RedijaApp — Serviço Google Picker API (Seleção Segura com drive.file)
// Permite abrir projetos compartilhados sem expandir o escopo OAuth.
// =====================================================================

const GOOGLE_API_JS_SRC = 'https://apis.google.com/js/api.js';

export interface PickedDriveFile {
  fileId: string;
  name: string;
  mimeType: string;
}

export class PickerNotConfiguredError extends Error {
  constructor(
    message = 'Google Picker API não configurada. Defina VITE_GOOGLE_API_KEY no arquivo .env para abrir arquivos compartilhados diretamente pelo seletor do Google.',
  ) {
    super(message);
    this.name = 'PickerNotConfiguredError';
  }
}

let gapiLoaderPromise: Promise<void> | null = null;

export function getGooglePickerConfig(
  env: Record<string, unknown> = import.meta.env as Record<string, unknown>,
): {
  apiKey: string;
  appId: string;
  isConfigured: boolean;
} {
  const rawApiKey = typeof env.VITE_GOOGLE_API_KEY === 'string' ? env.VITE_GOOGLE_API_KEY.trim() : '';
  const apiKey =
    rawApiKey && !rawApiKey.includes('sua_api_key') && !rawApiKey.includes('your_api_key')
      ? rawApiKey
      : '';

  const explicitAppId =
    typeof env.VITE_GOOGLE_APP_ID === 'string' ? env.VITE_GOOGLE_APP_ID.trim() : '';
  const clientId =
    typeof env.VITE_GOOGLE_CLIENT_ID === 'string' ? env.VITE_GOOGLE_CLIENT_ID.trim() : '';
  const inferredPrefix = clientId.split('-')[0]?.trim() || '';
  const appId = /^\d+$/.test(explicitAppId)
    ? explicitAppId
    : /^\d+$/.test(inferredPrefix)
      ? inferredPrefix
      : '';

  return {
    apiKey,
    appId,
    isConfigured: Boolean(apiKey),
  };
}

export function isGooglePickerConfigured(): boolean {
  return getGooglePickerConfig().isConfigured;
}

async function ensureGapiPickerLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Google Picker requer ambiente de navegador.');
  }

  if (window.google?.picker?.PickerBuilder) {
    return;
  }

  if (!gapiLoaderPromise) {
    gapiLoaderPromise = new Promise<void>((resolve, reject) => {
      const loadPickerModule = () => {
        if (!window.gapi) {
          gapiLoaderPromise = null;
          reject(new Error('Google API Loader (gapi) indisponível.'));
          return;
        }
        window.gapi.load('picker', {
          callback: () => resolve(),
          onerror: () => {
            gapiLoaderPromise = null;
            reject(new Error('Falha ao carregar o módulo Google Picker.'));
          },
          timeout: 12000,
          ontimeout: () => {
            gapiLoaderPromise = null;
            reject(new Error('Tempo esgotado ao carregar o módulo Google Picker.'));
          },
        });
      };

      if (window.gapi) {
        loadPickerModule();
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${GOOGLE_API_JS_SRC}"]`,
      );
      if (existingScript) {
        existingScript.addEventListener('load', loadPickerModule, { once: true });
        existingScript.addEventListener(
          'error',
          () => {
            gapiLoaderPromise = null;
            reject(new Error('Não foi possível baixar apis.google.com/js/api.js.'));
          },
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_API_JS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = loadPickerModule;
      script.onerror = () => {
        gapiLoaderPromise = null;
        reject(new Error('Falha de rede ou bloqueio de CSP ao carregar o Google Picker.'));
      };
      document.head.appendChild(script);
    });
  }

  return gapiLoaderPromise;
}

/**
 * Abre o seletor oficial do Google Drive com foco em "Compartilhados comigo" e "Meu Drive".
 * Selecionar o arquivo concede ao app a autorização `drive.file` necessária para acessá-lo.
 */
export async function openDriveFilePicker(
  accessToken: string,
  options?: { title?: string },
): Promise<PickedDriveFile | null> {
  if (!accessToken || accessToken.startsWith('mock_dev_token')) {
    throw new PickerNotConfiguredError(
      'O seletor do Google Drive exige login real com uma conta Google.',
    );
  }

  const { apiKey, appId, isConfigured } = getGooglePickerConfig();
  if (!isConfigured) {
    throw new PickerNotConfiguredError();
  }

  await ensureGapiPickerLoaded();

  const pickerApi = window.google?.picker;
  if (!pickerApi) {
    throw new Error('Google Picker não inicializado após o carregamento.');
  }

  return new Promise<PickedDriveFile | null>((resolve, reject) => {
    try {
      const sharedWithMeView = new pickerApi.DocsView(pickerApi.ViewId.DOCS)
        .setOwnedByMe(false)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      const myDriveView = new pickerApi.DocsView(pickerApi.ViewId.DOCS)
        .setOwnedByMe(true)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      const builder = new pickerApi.PickerBuilder()
        .addView(sharedWithMeView)
        .addView(myDriveView)
        .addView(pickerApi.ViewId.RECENTLY_PICKED)
        .enableFeature(pickerApi.Feature.SUPPORT_DRIVES)
        .setLocale('pt-BR')
        .setTitle(options?.title || 'Selecione o projeto .redija compartilhado no Google Drive')
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey);

      if (appId) {
        builder.setAppId(appId);
      }

      builder.setCallback((data) => {
        const action = data[pickerApi.Response.ACTION] ?? data.action;
        if (action === pickerApi.Action.CANCEL) {
          resolve(null);
          return;
        }
        if (action === pickerApi.Action.PICKED) {
          const docs = (data[pickerApi.Response.DOCUMENTS] ?? data.docs ?? []) as
            | google.picker.PickerDocument[]
            | undefined;
          const picked = docs?.[0];
          if (!picked) {
            resolve(null);
            return;
          }
          const fileId = picked[pickerApi.Document.ID] || '';
          const name = picked[pickerApi.Document.NAME] || 'Projeto Compartilhado';
          const mimeType = picked[pickerApi.Document.MIME_TYPE] || '';
          if (!fileId) {
            resolve(null);
            return;
          }
          resolve({ fileId, name, mimeType });
        }
      });

      const picker = builder.build();
      picker.setVisible(true);
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Erro ao exibir Google Picker.'));
    }
  });
}
