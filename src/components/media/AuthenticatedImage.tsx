'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { downloadMedia } from '@/lib/api/media';
import styles from './media.module.css';

interface AuthenticatedImageProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function AuthenticatedImage({
  url, alt, className, width = 320, height = 180,
}: AuthenticatedImageProps) {
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    let active = true;
    let objectUrl: string | null = null;
    downloadMedia(url)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setSource(null);
    };
  }, [url]);

  if (!url || error) return <span className={styles.placeholder} role="img" aria-label={`Sin imagen de ${alt}`} />;
  if (!source) return <span className={styles.skeleton} role="status" aria-label={`Cargando imagen de ${alt}`} />;
  return <Image unoptimized src={source} alt={alt} width={width} height={height} className={className ?? styles.image} />;
}
