import { useState, useCallback, useRef, useEffect } from 'react';
import { DocumentProject } from '@/types/document';
import {
  compileProjectToPdf,
  OfflineSlidesPackageRequiredError,
  triggerBlobDownload,
} from '@/core/typst/projectCompiler';
import { getTemplateCapabilities } from '@/core/templates/templateCapabilities';
import { generateStandaloneTypst } from '@/core/transpiler/typstGenerator';
import {
  dismissDocxConversionNotice,
  DOCX_CONVERSION_NOTICE_TEXT,
  exportProjectToDocx,
  exportTypstProjectZip,
  getCleanProjectSlug,
  isDocxConversionNoticeDismissed,
} from '@/core/transpiler/projectExporter';
import { saveProjectPdfToDrive } from '@/core/storage/googleDriveService';
import { toast } from '@/components/ui/toastStore';

interface UseDocumentExportOptions {
  project: DocumentProject;
  isAuthenticated: boolean;
  getValidAccessToken: (interactive?: boolean) => Promise<string | null>;
}

interface DownloadPdfOptions {
  isAuthenticated: boolean;
  getValidAccessToken: (interactive?: boolean) => Promise<string | null>;
}

/**
 * Compila um trabalho e baixa o PDF. Usado no editor e nos cards da Home.
 * Se o usuário estiver logado, guarda também uma cópia do PDF no Google Drive.
 */
export async function downloadProjectPdf(
  project: DocumentProject,
  { isAuthenticated, getValidAccessToken }: DownloadPdfOptions,
): Promise<boolean> {
  try {
    const caps = getTemplateCapabilities(project);
    const isPresentation =
      caps.effectiveType === 'presentation' ||
      (caps.effectiveType === 'universe_custom' &&
        project.templateConfig?.universePackage?.startsWith('@preview/touying'));
    const result = await compileProjectToPdf(project, {
      enforceSlidesPackageCache: Boolean(isPresentation),
    });
    if (result.error || !result.pdf) {
      const msg =
        result.error ||
        result.diagnostics.map((d) => `${d.location}: ${d.message}`).join('\n') ||
        'Não foi possível gerar o PDF.';
      toast.error(`Erro ao gerar PDF:\n${msg}`);
      return false;
    }

    const pdfBytes = new Uint8Array(result.pdf);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    triggerBlobDownload(blob, `${project.name.toLowerCase().replace(/\s+/g, '_')}.pdf`);

    // Sincroniza em segundo plano uma cópia do PDF compilado no Google Drive se autenticado
    if (isAuthenticated) {
      getValidAccessToken().then((token) => {
        if (token) {
          saveProjectPdfToDrive(project, pdfBytes, token).catch((err) =>
            console.warn('Erro ao sincronizar cópia PDF no Drive:', err),
          );
        }
      });
    }
    return true;
  } catch (err) {
    if (err instanceof OfflineSlidesPackageRequiredError) {
      toast.error(err.message);
      return false;
    }
    toast.error(err instanceof Error ? err.message : 'Erro ao gerar PDF.');
    return false;
  }
}

/**
 * Converte um trabalho para Word (.docx) nas medidas da norma e dispara o download.
 * Exibe o aviso de primeira conversão (com opção "Não mostrar novamente") e eventuais
 * avisos sobre figuras indisponíveis, equações não suportadas ou citações órfãs.
 */
export async function downloadProjectDocx(project: DocumentProject): Promise<boolean> {
  const result = await exportProjectToDocx(project);
  triggerBlobDownload(result.blob, result.fileName);

  if (!isDocxConversionNoticeDismissed()) {
    toast.info(DOCX_CONVERSION_NOTICE_TEXT, {
      action: {
        label: 'Não mostrar novamente',
        onClick: () => dismissDocxConversionNotice(),
      },
    });
  }

  if (result.warnings.length > 0) {
    toast.info(result.warnings.join('\n'));
  }

  return true;
}

export const PROJECT_ZIP_EXPORT_ERROR_MESSAGE =
  'Não foi possível exportar o projeto (.zip). Tente novamente.';

interface DownloadProjectZipOptions {
  /** Ação do botão "Tentar novamente" da notificação de erro. Padrão: repete a exportação. */
  onRetry?: () => void;
}

/**
 * Empacota o trabalho como projeto Typst (.zip) e dispara o download.
 * Se a exportação falhar, avisa o usuário com a opção de tentar de novo, em vez de
 * só encerrar o carregamento sem baixar nada.
 */
export async function downloadProjectZip(
  project: DocumentProject,
  { onRetry }: DownloadProjectZipOptions = {},
): Promise<boolean> {
  try {
    const zipBlob = await exportTypstProjectZip(project);
    triggerBlobDownload(zipBlob, `${getCleanProjectSlug(project.name)}_typst.zip`);
    return true;
  } catch (err) {
    // O detalhe técnico (JSZip, geração do Typst) fica no console; o usuário recebe a mensagem
    console.error('Erro ao exportar pacote do projeto:', err);
    toast.error(PROJECT_ZIP_EXPORT_ERROR_MESSAGE, {
      action: {
        label: 'Tentar novamente',
        onClick: onRetry ?? (() => void downloadProjectZip(project)),
      },
    });
    return false;
  }
}

export function useDocumentExport({
  project,
  isAuthenticated,
  getValidAccessToken,
}: UseDocumentExportOptions) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingProject, setIsExportingProject] = useState(false);
  const retryDocxRef = useRef<() => void>(() => {});
  const retryProjectZipRef = useRef<() => void>(() => {});

  const handleDownloadPdf = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      await downloadProjectPdf(project, { isAuthenticated, getValidAccessToken });
    } finally {
      setIsExportingPdf(false);
    }
  }, [project, isAuthenticated, getValidAccessToken]);

  const handleDownloadDocx = useCallback(async () => {
    setIsExportingDocx(true);
    try {
      await downloadProjectDocx(project);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Não foi possível exportar para .docx. Verifique sua conexão e tente novamente.';
      toast.error(message, {
        action: {
          label: 'Tentar novamente',
          onClick: () => {
            retryDocxRef.current();
          },
        },
      });
    } finally {
      setIsExportingDocx(false);
    }
  }, [project]);

  useEffect(() => {
    retryDocxRef.current = () => {
      void handleDownloadDocx();
    };
  }, [handleDownloadDocx]);

  const handleExportProjectZip = useCallback(async () => {
    setIsExportingProject(true);
    try {
      // A nova tentativa passa pelo handler mais recente para reexibir o carregamento
      await downloadProjectZip(project, { onRetry: () => retryProjectZipRef.current() });
    } finally {
      setIsExportingProject(false);
    }
  }, [project]);

  useEffect(() => {
    retryProjectZipRef.current = () => {
      void handleExportProjectZip();
    };
  }, [handleExportProjectZip]);

  const handleExportTypst = useCallback(() => {
    const code = generateStandaloneTypst(project);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, `${project.name.toLowerCase().replace(/\s+/g, '_')}.typ`);
  }, [project]);

  return {
    isExportingPdf,
    isExportingDocx,
    isExportingProject,
    handleDownloadPdf,
    handleDownloadDocx,
    handleExportProjectZip,
    handleExportTypst,
  };
}
