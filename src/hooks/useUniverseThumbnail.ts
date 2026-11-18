import { useEffect, useState } from 'react';
import { getUniversePackageThumbnail } from '@/core/universe/universeResolver';

/**
 * URL temporária (blob:) da capa real de um modelo do Typst Universe, ou `null` enquanto não
 * houver (carregando, pacote sem capa ou sem conexão). A URL é liberada ao desmontar.
 */
export function useUniverseThumbnail(packageId: string): string | null {
  const [thumbnail, setThumbnail] = useState<{ packageId: string; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    void getUniversePackageThumbnail(packageId).then((result) => {
      if (cancelled || !result) return;
      url = URL.createObjectURL(new Blob([result.bytes as BlobPart], { type: result.mime }));
      setThumbnail({ packageId, url });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [packageId]);

  return thumbnail?.packageId === packageId ? thumbnail.url : null;
}
