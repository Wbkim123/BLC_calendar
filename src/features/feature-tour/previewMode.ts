export type FeatureTourPreviewRole = 'student' | 'chief' | 'sgl' | 'commander';

export const getFeatureTourPreviewRole = (): FeatureTourPreviewRole | null => {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return null;
  if (!['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)) return null;
  const preview = new URLSearchParams(window.location.search).get('previewFeatureTour');
  return preview === 'student' || preview === 'chief' || preview === 'sgl' || preview === 'commander' ? preview : null;
};
