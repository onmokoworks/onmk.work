export const mockTags = [
  {
    id: 'motion',
    title: 'Motion',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    publishedAt: '2026-01-01T00:00:00.000Z',
    revisedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'design',
    title: 'Design',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    publishedAt: '2026-01-02T00:00:00.000Z',
    revisedAt: '2026-01-02T00:00:00.000Z',
  },
];

export const mockWorks = [
  {
    id: 'sample-adjustment-layer-pack',
    title: 'Adjustment Layer Pack Study',
    description: '<p>ローカル確認用のダミー作品です。AEP Viewer や AE 連携の見た目確認に使います。</p>',
    images: [
      { url: 'https://picsum.photos/seed/onmk-work-1/1280/720', width: 1280, height: 720 },
      { url: 'https://picsum.photos/seed/onmk-work-2/1280/720', width: 1280, height: 720 },
      { url: 'https://picsum.photos/seed/onmk-work-3/1280/720', width: 1280, height: 720 },
    ],
    tag: [mockTags[0], mockTags[1]],
    year: '2026',
    credit: '<p>Mock dataset for local editing preview.</p>',
    link: 'https://example.com',
    'url-Youtube': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-01T00:00:00.000Z',
    publishedAt: '2026-02-01T00:00:00.000Z',
    revisedAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'sample-material-browser',
    title: 'Material Browser Prototype',
    description: '<p>素材の使い回しや Explorer 導線を想定したサンプルです。</p>',
    images: [
      { url: 'https://picsum.photos/seed/onmk-work-4/1280/720', width: 1280, height: 720 },
      { url: 'https://picsum.photos/seed/onmk-work-5/1280/720', width: 1280, height: 720 },
    ],
    tag: [mockTags[1]],
    year: '2025',
    credit: '<p>Secondary mock entry.</p>',
    createdAt: '2025-11-15T00:00:00.000Z',
    updatedAt: '2025-11-15T00:00:00.000Z',
    publishedAt: '2025-11-15T00:00:00.000Z',
    revisedAt: '2025-11-15T00:00:00.000Z',
  },
  {
    id: 'sample-log-archive',
    title: 'Log Archive Visual Test',
    description: '<p>ログ系 UI の密度確認用。</p>',
    images: [
      { url: 'https://picsum.photos/seed/onmk-work-6/1280/720', width: 1280, height: 720 },
    ],
    tag: [mockTags[0]],
    year: '2024',
    credit: '<p>Archive sample.</p>',
    createdAt: '2024-06-20T00:00:00.000Z',
    updatedAt: '2024-06-20T00:00:00.000Z',
    publishedAt: '2024-06-20T00:00:00.000Z',
    revisedAt: '2024-06-20T00:00:00.000Z',
  },
];

export const mockScripts = [
  {
    id: 'ae-helper',
    title: 'AE Helper Script',
    slug: 'ae-helper-script',
    thumbnail: { url: 'https://picsum.photos/seed/onmk-script-1/1200/900', width: 1200, height: 900 },
    summary: 'After Effects 用の補助スクリプト。何ができるかを短く示す一覧用テキストです。',
    description: '<p>After Effects 向けのダミースクリプトです。詳細ページで使い方を書いて、最後に GitHub へ流す想定です。</p><p>タグの見え方とカード一覧の密度確認にも使います。</p>',
    tool: 'Ae_scripts, Automation',
    url: 'https://example.com/ae-helper',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    publishedAt: '2026-01-10T00:00:00.000Z',
    revisedAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'blender-helper',
    title: 'Blender Helper',
    slug: 'blender-helper',
    thumbnail: { url: 'https://picsum.photos/seed/onmk-script-2/1200/900', width: 1200, height: 900 },
    summary: 'Blender 向けの小さな補助ツール。用途を一覧で即判別できるようにする短文です。',
    description: '<p>Blender 向けのダミーツールです。works と同じサムネイル文化を残しつつ、資料ページ寄りの見せ方を試すためのサンプルです。</p>',
    tool: 'Blender, Utility',
    url: 'https://example.com/blender-helper',
    createdAt: '2026-01-11T00:00:00.000Z',
    updatedAt: '2026-01-11T00:00:00.000Z',
    publishedAt: '2026-01-11T00:00:00.000Z',
    revisedAt: '2026-01-11T00:00:00.000Z',
  },
];

export const mockScriptsPage = {
  id: 'scripts-page',
  title: 'Tools',
  description: 'microCMS の認証がないローカル環境でも見た目調整を進めるためのダミー表示です。',
  createdAt: '2026-01-10T00:00:00.000Z',
  updatedAt: '2026-01-10T00:00:00.000Z',
  publishedAt: '2026-01-10T00:00:00.000Z',
  revisedAt: '2026-01-10T00:00:00.000Z',
};

export const mockLogEntries = [
  {
    id: 'log-001',
    images: Array.from({ length: 12 }, (_, index) => ({
      url: `https://picsum.photos/seed/onmk-log-${index + 1}/800/${500 + (index % 4) * 80}`,
      width: 800,
      height: 500 + (index % 4) * 80,
    })),
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
    publishedAt: '2026-01-15T00:00:00.000Z',
    revisedAt: '2026-01-15T00:00:00.000Z',
  },
];
