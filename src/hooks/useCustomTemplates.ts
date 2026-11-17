import { useCallback, useSyncExternalStore } from 'react';
import {
  addCustomTemplate,
  getCustomTemplates,
  removeCustomTemplate,
  restoreCustomTemplate,
  subscribeCustomTemplates,
  type CustomTemplate,
} from '@/core/storage/customTemplates';

/** Modelos personalizados do perfil ativo, com ações de adicionar, remover e desfazer. */
export function useCustomTemplates(owner: string) {
  const getSnapshot = useCallback(() => getCustomTemplates(owner), [owner]);
  const templates = useSyncExternalStore(subscribeCustomTemplates, getSnapshot, getSnapshot);

  const add = useCallback(
    (input: { name: string; packageId: string }) => addCustomTemplate(owner, input),
    [owner],
  );
  const remove = useCallback((id: string) => removeCustomTemplate(owner, id), [owner]);
  const restore = useCallback((template: CustomTemplate) => restoreCustomTemplate(owner, template), [owner]);

  return { templates, add, remove, restore };
}
