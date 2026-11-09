import { useState, useCallback } from 'react';
import { DocumentProject } from '@/types/document';
import { compileProjectToPdf, triggerBlobDownload } from '@/core/typst/projectCompiler';
import { generateStandaloneTypst } from '@/core/transpiler/typstGenerator';
import { exportTypstProjectZip, getCleanProjectSlug } from '@/core/transpiler/projectExporter';
import { saveProjectPdfToDrive } from '@/core/storage/googleDriveService';

interface UseDocumentExportOptions {
  project: DocumentProject;
  isAuthenticated: boolean;
  getValidAccessToken: (interactive?: boolean) => Promise<string | null>;
}

export function useDocumentExport({
  project,
  isAuthenticated,
  getValidAccessToken,
}: UseDocumentExportOptions) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingProject, setIsExportingProject] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      const result = await compileProjectToPdf(project);
      if (result.error || !result.pdf) {
        const msg =
          result.error ||
          result.diagnostics.map((d) => `${d.location}: ${d.message}`).join('\n') ||
          'Não foi possível gerar o PDF.';
        alert(`Erro ao gerar PDF:\n${msg}`);
        return;
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
    } finally {
      setIsExportingPdf(false);
    }
  }, [project, isAuthenticated, getValidAccessToken]);

  const handleExportProjectZip = useCallback(async () => {
    setIsExportingProject(true);
    try {
      const zipBlob = await exportTypstProjectZip(project);
      triggerBlobDownload(zipBlob, `${getCleanProjectSlug(project.name)}_typst.zip`);
    } catch (err) {
      console.error('Erro ao exportar pacote do projeto:', err);
    } finally {
      setIsExportingProject(false);
    }
  }, [project]);

  const handleExportTypst = useCallback(() => {
    const code = generateStandaloneTypst(project);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    triggerBlobDownload(blob, `${project.name.toLowerCase().replace(/\s+/g, '_')}.typ`);
  }, [project]);

  return {
    isExportingPdf,
    isExportingProject,
    handleDownloadPdf,
    handleExportProjectZip,
    handleExportTypst,
  };
}
