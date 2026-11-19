// =====================================================================
// RedijaApp: Sincronização dos modelos personalizados com o Google Drive
// =====================================================================
//
// Ler o arquivo do Drive → mesclar item a item com a lista local → gravar o que mudou de cada
// lado. Nada é apagado de verdade (só marcado com `deletedAt`), então um arquivo que ainda não
// tem um modelo local significa apenas "ainda não enviado", e a próxima sincronização corrige
// qualquer gravação concorrente entre dois aparelhos.
//
// O perfil local (`'local'`) nunca é sincronizado, e os modelos dele nunca são mesclados na
// conta Google: cada lista é lida e gravada só para o próprio dono.

import {
  applySyncedCustomTemplates,
  getCustomTemplateRecords,
  isSyncableTemplatesOwner,
  refreshCustomTemplatesFromDb,
} from './customTemplates';
import { mergeCustomTemplateLists, type SyncedCustomTemplate } from './customTemplatesMerge';
import {
  deleteCustomTemplatesDriveFile,
  isMockDriveToken,
  listCustomTemplatesDriveFiles,
  loadCustomTemplatesFromDrive,
  saveCustomTemplatesToDrive,
} from './customTemplatesDrive';

/** Espera após adicionar, remover ou desfazer antes de enviar ao Drive. */
export const CUSTOM_TEMPLATES_SYNC_DEBOUNCE_MS = 2000;

export interface CustomTemplatesSyncResult {
  status: 'synced' | 'skipped';
  /** Chegaram alterações de outro aparelho. */
  changedLocal: boolean;
  /** O arquivo do Drive foi criado ou atualizado. */
  uploaded: boolean;
}

const SKIPPED: CustomTemplatesSyncResult = { status: 'skipped', changedLocal: false, uploaded: false };

const inFlight = new Map<string, Promise<CustomTemplatesSyncResult>>();
const rerunRequested = new Set<string>();

async function runSync(owner: string, accessToken: string): Promise<CustomTemplatesSyncResult> {
  await refreshCustomTemplatesFromDb(owner);

  const files = await listCustomTemplatesDriveFiles(accessToken);
  let remote: SyncedCustomTemplate[] = [];
  for (const file of files) {
    const content = await loadCustomTemplatesFromDrive(file.id, accessToken);
    remote = files.length === 1 ? content : mergeCustomTemplateLists(remote, content).merged;
  }

  const local = getCustomTemplateRecords(owner);
  const { merged, changedLocal, changedRemote } = mergeCustomTemplateLists(local, remote);

  let appliedLocal = false;
  if (changedLocal) {
    appliedLocal = await applySyncedCustomTemplates(owner, merged);
  }

  // Sem nada dos dois lados, não cria um arquivo vazio no Drive do usuário.
  if (files.length === 0 && merged.length === 0) {
    return { status: 'synced', changedLocal: appliedLocal, uploaded: false };
  }

  let uploaded = false;
  const primary = files[0];
  if (!primary || changedRemote || files.length > 1) {
    await saveCustomTemplatesToDrive(merged, accessToken, primary?.id);
    uploaded = true;
    // Cópias criadas ao mesmo tempo por outro aparelho: o conteúdo já foi mesclado no principal.
    for (const extra of files.slice(1)) {
      await deleteCustomTemplatesDriveFile(extra.id, accessToken).catch((err) => {
        console.warn('Não foi possível remover a cópia duplicada dos modelos no Drive:', err);
      });
    }
  }

  return { status: 'synced', changedLocal: appliedLocal, uploaded };
}

/**
 * Sincroniza os modelos de uma conta Google com o Drive. Chamadas concorrentes para a mesma
 * conta não se sobrepõem: quem chega durante uma sincronização pede uma nova rodada ao fim.
 * O perfil local e o "Usuário Demonstração" nunca tocam no Drive.
 */
export function syncCustomTemplatesWithDrive(
  owner: string,
  accessToken: string,
): Promise<CustomTemplatesSyncResult> {
  if (!isSyncableTemplatesOwner(owner) || !accessToken || isMockDriveToken(accessToken)) {
    return Promise.resolve(SKIPPED);
  }

  const running = inFlight.get(owner);
  if (running) {
    rerunRequested.add(owner);
    return running;
  }

  const task = (async () => {
    try {
      let result: CustomTemplatesSyncResult;
      let changedLocal = false;
      let uploaded = false;
      do {
        rerunRequested.delete(owner);
        result = await runSync(owner, accessToken);
        changedLocal ||= result.changedLocal;
        uploaded ||= result.uploaded;
      } while (rerunRequested.has(owner));
      return { ...result, changedLocal, uploaded };
    } finally {
      rerunRequested.delete(owner);
      inFlight.delete(owner);
    }
  })();
  inFlight.set(owner, task);
  return task;
}
