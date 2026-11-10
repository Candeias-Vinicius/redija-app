import React, { useState } from 'react';
import { LandingNav } from './landing/LandingNav';
import { LandingHero } from './landing/LandingHero';
import { LandingComparison } from './landing/LandingComparison';
import { LandingFeatures } from './landing/LandingFeatures';
import { LandingTemplates } from './landing/LandingTemplates';
import { LandingLinters } from './landing/LandingLinters';
import { LandingWorkflow } from './landing/LandingWorkflow';
import { LandingFaq } from './landing/LandingFaq';
import { LandingCtaBanner } from './landing/LandingCtaBanner';
import { LandingFooter } from './landing/LandingFooter';
import { LandingModals, LandingModalType } from './landing/LandingModals';

export interface LoginScreenProps {
  onLogin: () => Promise<string | null>;
  onLoginDevMock: () => void;
  onContinueAsGuest: () => void;
  onOpenFullDocs?: (sectionId?: string) => void;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  pendingSharedDriveFileId?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onLoginDevMock,
  onContinueAsGuest,
  onOpenFullDocs,
  isLoading,
  error,
  isConfigured,
  darkMode,
  onToggleDarkMode,
  pendingSharedDriveFileId,
}) => {
  // Modal de suporte (Documentação, Sobre nós, Contato, etc.)
  const [activeModal, setActiveModal] = useState<LandingModalType>(null);
  const [selectedStandard, setSelectedStandard] = useState<string | undefined>(undefined);

  // Controle local do tema caso darkMode não venha pelas props
  const [localDark, setLocalDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  const isDark = darkMode !== undefined ? darkMode : localDark;

  const handleToggleTheme = () => {
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      const next = !localDark;
      setLocalDark(next);
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('redija:darkMode', '1');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('redija:darkMode', '0');
      }
    }
  };

  const handleOpenDoc = (standardCode?: string) => {
    setSelectedStandard(standardCode);
    setActiveModal('docs');
  };

  const handleOpenModal = (type: LandingModalType, standardCode?: string) => {
    setSelectedStandard(standardCode);
    setActiveModal(type);
  };

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScrollToAuth = () => {
    const el = document.getElementById('auth-card');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      handleScrollToTop();
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${
        isDark
          ? 'bg-[#080d19] text-slate-100 selection:bg-emerald-950 selection:text-emerald-200'
          : 'bg-slate-50 text-slate-800 selection:bg-emerald-200 selection:text-emerald-900'
      }`}
    >
      {/* 1. Barra de Navegação Superior Fixa */}
      <LandingNav
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onOpenDoc={handleOpenDoc}
        onOpenFullDocs={onOpenFullDocs}
        onOpenLogin={onLogin}
        isLoading={isLoading}
      />

      {/* 2. Hero Section com Headline, Auth Card e Mockup Interativo do App */}
      <LandingHero
        isDark={isDark}
        onLogin={onLogin}
        onLoginDevMock={onLoginDevMock}
        onContinueAsGuest={onContinueAsGuest}
        isLoading={isLoading}
        error={error}
        isConfigured={isConfigured}
        pendingSharedDriveFileId={pendingSharedDriveFileId}
        onOpenDoc={() => handleOpenDoc()}
      />

      {/* 3. Comparativo Visual: Word vs LaTeX vs RedijaApp */}
      <LandingComparison isDark={isDark} />

      {/* 4. Deep-Dive dos 5 Pilares Principais (ABNT, WASM, Drive BYOS, P2P, Formatos) */}
      <LandingFeatures isDark={isDark} onOpenDoc={handleOpenDoc} />

      {/* 5. Galeria Interativa de Modelos Acadêmicos Prontos & Typst Universe */}
      <LandingTemplates
        isDark={isDark}
        onSelectTemplate={handleScrollToAuth}
        onOpenFullDocs={onOpenFullDocs}
      />

      {/* 5.5. Linters Contextuais por Modelo com Imagens Reais */}
      <LandingLinters
        isDark={isDark}
        onSelectTemplate={handleScrollToAuth}
        onOpenFullDocs={onOpenFullDocs}
      />

      {/* 6. Como Funciona em 3 Passos Simples */}
      <LandingWorkflow isDark={isDark} />

      {/* 7. Perguntas Frequentes (FAQ Accordion) */}
      <LandingFaq isDark={isDark} />

      {/* 8. Banner Final de Chamada para Ação (CTA) */}
      <LandingCtaBanner
        isDark={isDark}
        onLogin={onLogin}
        onContinueAsGuest={onContinueAsGuest}
      />

      {/* 9. Rodapé Completo com Abas de Documentação, Sobre Nós, Contato e Privacidade */}
      <LandingFooter
        isDark={isDark}
        onOpenModal={handleOpenModal}
        onOpenFullDocs={onOpenFullDocs}
        onScrollToTop={handleScrollToTop}
      />

      {/* 10. Modais Dinâmicos Integrados (Docs ABNT, About Us, Contact, Privacy, Terms) */}
      <LandingModals
        modalType={activeModal}
        selectedStandard={selectedStandard}
        onClose={() => setActiveModal(null)}
        onOpenFullDocs={onOpenFullDocs}
        isDark={isDark}
      />
    </div>
  );
};
