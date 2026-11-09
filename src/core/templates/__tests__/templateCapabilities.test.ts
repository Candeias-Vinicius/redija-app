import { describe, it, expect } from 'vitest';
import {
  getCustomizerScope,
  getTemplateCapabilities,
  getPreservedHiddenFields,
  resolveEffectiveTemplateType,
} from '../templateCapabilities';
import { createProjectFromTemplate } from '@/core/storage/projectTemplates';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document';

describe('templateCapabilities: Matriz de Capacidades e Preservação de Metadados', () => {
  describe('resolveEffectiveTemplateType', () => {
    it('prioriza presets dedicados (sbc, ieee, poster, universe_custom) sobre templateType legado', () => {
      const proj = createProjectFromTemplate('tcc', 'Base TCC');
      proj.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'ieee' };
      expect(resolveEffectiveTemplateType(proj)).toBe('ieee');

      proj.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'sbc' };
      expect(resolveEffectiveTemplateType(proj)).toBe('sbc');

      proj.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'poster' };
      expect(resolveEffectiveTemplateType(proj)).toBe('poster');

      proj.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'universe_custom' };
      expect(resolveEffectiveTemplateType(proj)).toBe('universe_custom');
    });

    it('mantém templateType quando preset é custom ou ABNT', () => {
      const proj = createProjectFromTemplate('sbc', 'Artigo SBC');
      proj.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'custom' };
      expect(resolveEffectiveTemplateType(proj)).toBe('sbc');
    });
  });

  describe('getTemplateCapabilities', () => {
    it('habilita todos os recursos ABNT e Linter para TCC (NBR 14724)', () => {
      const tcc = createProjectFromTemplate('tcc', 'TCC Padrão');
      const caps = getTemplateCapabilities(tcc);

      expect(caps.isAbntFamily).toBe(true);
      expect(caps.isModified).toBe(false);
      expect(caps.badgeLabel).toBe('NBR 14724');
      expect(caps.showPreTextuals).toBe(true);
      expect(caps.showResumoSection).toBe(true);
      expect(caps.showPostTextuals).toBe(true);
      expect(caps.showAbntLinter).toBe(true);
      expect(caps.linterStatusMode).toBe('abnt_active');
      expect(caps.showAbntGuide).toBe(true);
      expect(caps.identificacaoFields).toContain('advisor');
      expect(caps.identificacaoFields).toContain('coadvisor');
      expect(caps.identificacaoFields).toContain('nature');
    });

    it('oculta pré-textuais de monografia no Artigo NBR 6022 mantendo Linter e Guia ABNT', () => {
      const artigo = createProjectFromTemplate('artigo', 'Artigo NBR 6022');
      const caps = getTemplateCapabilities(artigo);

      expect(caps.isAbntFamily).toBe(true);
      expect(caps.badgeLabel).toBe('NBR 6022');
      expect(caps.showPreTextuals).toBe(false);
      expect(caps.showResumoSection).toBe(true);
      expect(caps.showPostTextuals).toBe(true);
      expect(caps.showAbntLinter).toBe(true);
      expect(caps.showAbntGuide).toBe(true);
      expect(caps.identificacaoFields).not.toContain('nature');
      expect(caps.identificacaoFields).not.toContain('coadvisor');
    });

    it('exibe badge ABNT Modificado, pausa o Linter e mantém Guia de Normas ABNT quando customizado', () => {
      const tcc = createProjectFromTemplate('tcc', 'TCC Customizado');
      tcc.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'custom', fontFamily: 'sans' };

      const caps = getTemplateCapabilities(tcc);
      expect(caps.isAbntFamily).toBe(true);
      expect(caps.isModified).toBe(true);
      expect(caps.badgeLabel).toBe('ABNT Modificado');
      expect(caps.showAbntLinter).toBe(false);
      expect(caps.linterStatusMode).toBe('abnt_modified');
      expect(caps.showAbntGuide).toBe(true);
    });

    it('reconhece NBR 10520:2023 como ABNT ativa e APA 7ª Ed. como não-ABNT', () => {
      const tcc = createProjectFromTemplate('tcc');
      tcc.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'abnt_2023' };

      const abnt2023 = getTemplateCapabilities(tcc);
      expect(abnt2023.isAbntFamily).toBe(true);
      expect(abnt2023.badgeLabel).toBe('NBR 10520:2023');
      expect(abnt2023.showAbntLinter).toBe(true);
      expect(abnt2023.showAbntGuide).toBe(true);

      tcc.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'apa_7' };
      const apa = getTemplateCapabilities(tcc);
      expect(apa.isAbntFamily).toBe(false);
      expect(apa.badgeLabel).toBe('APA 7ª Ed.');
      expect(apa.showAbntLinter).toBe(false);
      expect(apa.linterStatusMode).toBe('non_abnt');
      expect(apa.showAbntGuide).toBe(false);
    });

    it('oculta Guia ABNT e Verificador ABNT para SBC, IEEE, Pôster e Typst Universe', () => {
      const sbc = getTemplateCapabilities(createProjectFromTemplate('sbc'));
      expect(sbc.badgeLabel).toBe('SBC');
      expect(sbc.isAbntFamily).toBe(false);
      expect(sbc.showAbntLinter).toBe(false);
      expect(sbc.showAbntGuide).toBe(false);
      expect(sbc.linterStatusMode).toBe('non_abnt');
      expect(sbc.showPostTextuals).toBe(false);

      const ieee = getTemplateCapabilities(createProjectFromTemplate('ieee'));
      expect(ieee.badgeLabel).toBe('IEEE');
      expect(ieee.showAbntGuide).toBe(false);

      const poster = getTemplateCapabilities(createProjectFromTemplate('poster'));
      expect(poster.badgeLabel).toBe('Pôster A0/A1');
      expect(poster.showResumoSection).toBe(false);
      expect(poster.showPreTextuals).toBe(false);
      expect(poster.showAbntGuide).toBe(false);

      const universe = getTemplateCapabilities(createProjectFromTemplate('universe_custom'));
      expect(universe.badgeLabel).toBe('Typst Universe');
      expect(universe.identificacaoFields).toEqual(['title', 'author']);
      expect(universe.showAbntGuide).toBe(false);
    });

    it('aplica sufixo Modificado corretamente em SBC, IEEE e Pôster quando preset é custom', () => {
      const sbc = createProjectFromTemplate('sbc');
      sbc.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'custom' };
      expect(getTemplateCapabilities(sbc).badgeLabel).toBe('SBC Modificado');

      const ieee = createProjectFromTemplate('ieee');
      ieee.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'custom' };
      expect(getTemplateCapabilities(ieee).badgeLabel).toBe('IEEE Modificado');

      const poster = createProjectFromTemplate('poster');
      poster.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'custom' };
      expect(getTemplateCapabilities(poster).badgeLabel).toBe('Pôster Modificado');
    });

    it('expõe supportsSidebarFieldPdfSync, guia contextual plural e isSidebarCustomized por modelo', () => {
      const tcc = createProjectFromTemplate('tcc');
      const tccCaps = getTemplateCapabilities(tcc);
      expect(tccCaps.supportsSidebarFieldPdfSync).toBe(true);
      expect(tccCaps.guideMode).toBe('abnt');
      expect(tccCaps.guideLabel).toBe('Guia de Normas ABNT');

      tcc.sidebarConfig = { isCustomized: true, hiddenFieldIds: ['dedicatory'] };
      const tccSidebarCustomCaps = getTemplateCapabilities(tcc);
      expect(tccSidebarCustomCaps.isSidebarCustomized).toBe(true);
      expect(tccSidebarCustomCaps.isModified).toBe(true);
      expect(tccSidebarCustomCaps.badgeLabel).toBe('ABNT Modificado');
      expect(tccSidebarCustomCaps.preTextualFields).not.toContain('dedicatory');

      const sbc = createProjectFromTemplate('sbc');
      const sbcCaps = getTemplateCapabilities(sbc);
      expect(sbcCaps.supportsSidebarFieldPdfSync).toBe(false);
      expect(sbcCaps.guideMode).toBe('sbc');
      expect(sbcCaps.guideLabel).toBe('Manual de Submissão SBC');

      const ieee = createProjectFromTemplate('ieee');
      const ieeeCaps = getTemplateCapabilities(ieee);
      expect(ieeeCaps.supportsSidebarFieldPdfSync).toBe(false);
      expect(ieeeCaps.guideMode).toBe('ieee');
      expect(ieeeCaps.guideLabel).toBe('Diretrizes de Publicação IEEE');

      const poster = createProjectFromTemplate('poster');
      const posterCaps = getTemplateCapabilities(poster);
      expect(posterCaps.supportsSidebarFieldPdfSync).toBe(false);
      expect(posterCaps.guideMode).toBe('poster');
      expect(posterCaps.guideLabel).toBe('Boas Práticas de Pôster Científico');

      tcc.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'apa_7' };
      const apaCaps = getTemplateCapabilities(tcc);
      expect(apaCaps.guideMode).toBe('general');
      expect(apaCaps.guideLabel).toBe('Dicas de Diagramação e Boas Práticas');
    });

    it('não marca Documento em Branco recém-criado como Livre Modificado', () => {
      const blank = createProjectFromTemplate('em_branco');
      const caps = getTemplateCapabilities(blank);
      expect(caps.isModified).toBe(false);
      expect(caps.badgeLabel).toBe('Documento Livre');

      blank.sidebarConfig = { isCustomized: true };
      const customizedCaps = getTemplateCapabilities(blank);
      expect(customizedCaps.isModified).toBe(true);
      expect(customizedCaps.badgeLabel).toBe('Livre Modificado');
    });
  });

  describe('getPreservedHiddenFields (Zero Perda de Dados)', () => {
    it('não sinaliza campos falsos para placeholders padrão em novos templates', () => {
      for (const t of ['tcc', 'artigo', 'relatorio', 'projeto_pesquisa', 'sbc', 'ieee', 'poster'] as const) {
        const proj = createProjectFromTemplate(t);
        const caps = getTemplateCapabilities(proj);
        const hidden = getPreservedHiddenFields(proj, caps);
        expect(hidden).toEqual([]);
      }
    });

    it('preserva e lista campos preenchidos que ficam ocultos ao alternar TCC -> Pôster', () => {
      const proj = createProjectFromTemplate('tcc', 'TCC Completo');
      proj.metadata.advisor = 'Profa. Dra. Maria Clara';
      proj.metadata.dedicatory = 'Dedico à minha família.';
      proj.metadata.includeApprovalPage = true;
      proj.metadata.glossary = 'Typst: Sistema de composição tipográfica.';

      proj.templateType = 'poster';
      proj.templateConfig = { ...DEFAULT_TEMPLATE_CONFIG, preset: 'poster' };

      const caps = getTemplateCapabilities(proj);
      const hidden = getPreservedHiddenFields(proj, caps);
      const hiddenIds = hidden.map((h) => h.id);

      expect(hiddenIds).toContain('advisor');
      expect(hiddenIds).toContain('dedicatory');
      expect(hiddenIds).toContain('includeApprovalPage');
      expect(hiddenIds).toContain('abstract');
      expect(hiddenIds).toContain('keywords');
      expect(hiddenIds).toContain('glossary');
    });
  });

  describe('getCustomizerScope (Guardrails Contextuais)', () => {
    it('bloqueia colunas e margens para TCC (NBR 14724), liberando capa e sumário', () => {
      const scope = getCustomizerScope('tcc');
      expect(scope.isFullyUnrestricted).toBe(false);
      expect(scope.allowColumnChange).toBe(false);
      expect(scope.fixedColumns).toBe(1);
      expect(scope.columnLockedReason).toContain('NBR 14724');
      expect(scope.allowMarginChange).toBe(false);
      expect(scope.allowCoverToggle).toBe(true);
      expect(scope.allowTocToggle).toBe(true);
      expect(scope.allowedCitationFormats).toContain('abnt_titlecase');
      expect(scope.allowedCitationFormats).toContain('ieee_numeric');
    });

    it('bloqueia capa e sumário para Artigo (NBR 6022), mas permite alternar 1 ou 2 colunas', () => {
      const scope = getCustomizerScope('artigo');
      expect(scope.isFullyUnrestricted).toBe(false);
      expect(scope.allowColumnChange).toBe(true);
      expect(scope.allowCoverToggle).toBe(false);
      expect(scope.allowTitlePageToggle).toBe(false);
      expect(scope.allowTocToggle).toBe(false);
      expect(scope.structureLockedReason).toContain('NBR 6022');
      expect(scope.allowH1PageBreakToggle).toBe(false);
    });

    it('trava colunas em 1 e margens oficiais para Artigo SBC', () => {
      const scope = getCustomizerScope('sbc');
      expect(scope.allowColumnChange).toBe(false);
      expect(scope.fixedColumns).toBe(1);
      expect(scope.allowMarginChange).toBe(false);
      expect(scope.marginLockedReason).toContain('SBC');
      expect(scope.allowCoverToggle).toBe(false);
      expect(scope.allowedPresetIds).toEqual(['sbc']);
    });

    it('trava colunas em 2, margens compactas e citação exclusivamente em ieee_numeric para IEEE', () => {
      const scope = getCustomizerScope('ieee');
      expect(scope.allowColumnChange).toBe(false);
      expect(scope.fixedColumns).toBe(2);
      expect(scope.allowMarginChange).toBe(false);
      expect(scope.allowCoverToggle).toBe(false);
      expect(scope.allowedCitationFormats).toEqual(['ieee_numeric']);
      expect(scope.citationLockedReason).toContain('IEEE');
      expect(scope.allowedPresetIds).toEqual(['ieee']);
    });

    it('libera todas as opções para documento em branco (em_branco)', () => {
      const scope = getCustomizerScope('em_branco');
      expect(scope.isFullyUnrestricted).toBe(true);
      expect(scope.allowColumnChange).toBe(true);
      expect(scope.allowMarginChange).toBe(true);
      expect(scope.allowCoverToggle).toBe(true);
      expect(scope.allowTocToggle).toBe(true);
      expect(scope.allowedCitationFormats).toHaveLength(4);
    });

    it('libera todas as opções para Typst Universe comunitário (universe_custom)', () => {
      const scope = getCustomizerScope('universe_custom');
      expect(scope.isFullyUnrestricted).toBe(true);
      expect(scope.allowColumnChange).toBe(true);
      expect(scope.allowMarginChange).toBe(true);
    });

    it('libera opções restritas quando destravado manualmente pelo autor (escape hatch)', () => {
      const lockedScope = getCustomizerScope('tcc', undefined, false);
      expect(lockedScope.allowColumnChange).toBe(false);

      const unlockedScope = getCustomizerScope('tcc', undefined, true);
      expect(unlockedScope.isFullyUnrestricted).toBe(true);
      expect(unlockedScope.isManuallyUnlocked).toBe(true);
      expect(unlockedScope.allowColumnChange).toBe(true);
      expect(unlockedScope.allowMarginChange).toBe(true);
    });
  });
});
