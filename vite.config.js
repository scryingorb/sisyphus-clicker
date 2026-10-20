import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/sisyphus-clicker/' : './',
  plugins: [{
    name: 'offline-desktop-csp', apply: 'build',
    transformIndexHtml() {
      return [
        ...(process.env.GITHUB_PAGES === 'true' ? [{tag:'meta',attrs:{name:'build-revision',content:process.env.GITHUB_SHA || 'local'},injectTo:'head'}] : []),
        {tag:'meta',attrs:{'http-equiv':'Content-Security-Policy',content:"default-src 'self' blob: data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'self'"},injectTo:'head-prepend'}
      ];
    }
  }]
});
