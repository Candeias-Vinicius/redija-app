// =====================================================================
// Tipagens para Google Identity Services (GIS) e Google Picker API
// =====================================================================

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: unknown) => void;
        prompt?: string;
        enable_serial_consent?: boolean;
        hint?: string;
      }

      interface TokenResponse {
        access_token: string;
        expires_in: number;
        hd?: string;
        prompt: string;
        token_type: string;
        scope: string;
        state?: string;
        error?: string;
        error_description?: string;
        error_uri?: string;
      }

      interface OverridableTokenClientConfig {
        prompt?: string;
        hint?: string;
        enable_serial_consent?: boolean;
      }

      interface TokenClient {
        requestAccessToken: (overrideConfig?: OverridableTokenClientConfig) => void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
      function revoke(accessToken: string, done?: () => void): void;
    }

    namespace id {
      function disableAutoSelect(): void;
    }
  }

  namespace picker {
    const ViewId: {
      DOCS: string;
      RECENTLY_PICKED: string;
    };

    const Response: {
      ACTION: string;
      DOCUMENTS: string;
    };

    const Action: {
      PICKED: string;
      CANCEL: string;
      ERROR?: string;
    };

    const Document: {
      ID: string;
      NAME: string;
      MIME_TYPE: string;
      URL: string;
    };

    const Feature: {
      NAV_HIDDEN: string;
      SUPPORT_DRIVES: string;
    };

    interface PickerDocument {
      [key: string]: string | undefined;
    }

    interface ResponseObject {
      action?: string;
      docs?: PickerDocument[];
      [key: string]: unknown;
    }

    class DocsView {
      constructor(viewId?: string);
      setOwnedByMe(ownedByMe: boolean): this;
      setIncludeFolders(included: boolean): this;
      setSelectFolderEnabled(enabled: boolean): this;
      setQuery(query: string): this;
      setMimeTypes(mimeTypes: string): this;
    }

    class PickerBuilder {
      addView(viewOrId: DocsView | string): this;
      enableFeature(feature: string): this;
      setOAuthToken(token: string): this;
      setDeveloperKey(key: string): this;
      setAppId(appId: string): this;
      setTitle(title: string): this;
      setLocale(locale: string): this;
      setCallback(cb: (data: ResponseObject) => void): this;
      build(): { setVisible: (visible: boolean) => void; dispose?: () => void };
    }
  }
}

interface GapiLoadOptions {
  callback: () => void;
  onerror?: () => void;
  timeout?: number;
  ontimeout?: () => void;
}

interface GapiNamespace {
  load(libraries: string, options: GapiLoadOptions | (() => void)): void;
}

interface Window {
  google?: typeof google;
  gapi?: GapiNamespace;
}
