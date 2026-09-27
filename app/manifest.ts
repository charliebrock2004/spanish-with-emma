import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Spanish with Emma',
    short_name: 'Emma',
    description: 'Learn Spanish by talking with Emma.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fbf3e8',
    theme_color: '#fbf3e8',
    categories: ['education', 'games'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
