import { useEffect, type RefObject } from 'react';

/**
 * Fecha um menu/popover ao clicar fora dele ou ao pressionar Esc.
 * `returnFocusRef` recebe o foco de volta quando o menu é fechado pelo Esc.
 */
export function useDismiss(
  isOpen: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  returnFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        returnFocusRef?.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, containerRef, onClose, returnFocusRef]);
}
