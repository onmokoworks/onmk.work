# workspace

実験の一覧は`src/pages/workspace/index.astro`で管理します。

実験本体は独立したGitHubリポジトリに置き、`workspace.json`で公開するコミットを指定します。`npm run build`で指定コミットを取得し、静的ファイルを`/workspace/wadalab-motion/`に配置します。生成ファイルはGitに含めません。

wadalab-motionを更新するときは、本体をGitHubへpushしてから`workspace.json`のコミットを更新し、onmk.workのmainへpushします。Cloudflare PagesのGitHub連携で本番を更新します。
