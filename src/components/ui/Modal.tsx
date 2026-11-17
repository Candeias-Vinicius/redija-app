import React, { useLayoutEffect, useRef } from 'react';

interface ModalProps {
  /** Chamado ao pressionar Esc, ao clicar no fundo (se habilitado) ou quando o navegador fecha o diálogo. */
  onClose: () => void;
  /** id do título visível do modal (preferível a ariaLabel). */
  labelledBy?: string;
  ariaLabel?: string;
  /** Fecha ao clicar fora do painel. */
  closeOnBackdrop?: boolean;
  /** Classes extras do contêiner (overlay). */
  className?: string;
  onPaste?: React.ClipboardEventHandler<HTMLDialogElement>;
  children: React.ReactNode;
}

/**
 * Modal acessível baseado no <dialog> nativo com showModal():
 * - prende o foco dentro do modal e torna o restante da página inerte;
 * - fecha com Esc;
 * - devolve o foco ao elemento que abriu o modal ao fechar;
 * - expõe role="dialog" + aria-modal + nome acessível.
 *
 * Deve ser renderizado apenas enquanto o modal estiver aberto
 * (ex.: `if (!isOpen) return null`).
 */
export const Modal: React.FC<ModalProps> = ({
  onClose,
  labelledBy,
  ariaLabel,
  closeOnBackdrop = false,
  className = '',
  onPaste,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const handleCancel = (event: Event) => {
      // Esc: deixa o React decidir o fechamento (mantém o estado como fonte da verdade)
      event.preventDefault();
      onCloseRef.current();
    };
    // O navegador pode fechar o diálogo por conta própria (ex.: Esc repetido); sincroniza o estado.
    // O evento "close" é assíncrono: ignora o que chega quando o diálogo já foi reaberto
    // (acontece no StrictMode, que monta, desmonta e monta o efeito de novo).
    const handleClose = () => {
      if (!dialog.open) onCloseRef.current();
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);

    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
    }

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-modal="true"
      onPaste={onPaste}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
      className={`fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-transparent p-4 text-inherit open:flex items-center justify-center backdrop:bg-black/50 backdrop:backdrop-blur-xs ${className}`}
    >
      {children}
    </dialog>
  );
};
