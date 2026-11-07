// =====================================================================
// Tipagens para Google Identity Services (GIS)
// =====================================================================

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: any) => void;
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
}

interface Window {
  google?: typeof google;
}
