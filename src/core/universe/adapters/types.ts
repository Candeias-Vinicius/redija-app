import type { DocumentProject, TemplateConfig } from '@/types/document';

export interface UniverseAdapterContext {
  project: DocumentProject;
  cfg: TemplateConfig;
  /** Pacote do projeto, já validado (ex.: `@preview/abntly:0.1.1`). */
  packageId: string;
  /** `#set text(font: ...)` para a fonte escolhida no Customizer, ou `null` na fonte padrão. */
  fontRule: (fallback: 'serif' | 'sans', always?: boolean) => string | null;
  /** Caminho do logo da instituição no projeto, quando há logo e as imagens entram. */
  logoPath?: string;
}

/**
 * Adaptador: código escrito para um modelo específico, quando ler o exemplo do modelo
 * não basta (o modelo monta capa e resumo com chamadas próprias, por exemplo) ou quando
 * o resultado precisa seguir a aba Estrutura do Customizer. Os demais modelos usam o
 * caminho genérico de `universeHeader.ts`.
 */
export interface UniverseAdapter {
  /** Nome do pacote no Typst Universe, sem namespace e versão. */
  packageName: string;
  /** Imports do pacote, regra `#show` e páginas iniciais. */
  build: (ctx: UniverseAdapterContext) => string;
}
