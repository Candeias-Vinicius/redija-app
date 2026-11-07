import React from 'react';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
  variant?: 'dark' | 'light' | 'auto';
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  className = '',
}) => {
  // Ajuste de altura responsiva preservando o aspect ratio 1024x571 do logotipo original
  const heightClass =
    size === 'sm'
      ? 'h-8'
      : size === 'md'
        ? 'h-14'
        : size === 'lg'
          ? 'h-20'
          : 'h-28';

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src="/logo.jpg"
        alt="RedijaApp"
        className={`${heightClass} w-auto object-contain rounded-xl shadow-xs`}
      />
    </div>
  );
};
