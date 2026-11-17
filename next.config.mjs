/** @type {import('next').NextConfig} */
export default {
  // A interface original (public/index.html + app.js) abre na raiz do site.
  async rewrites() {
    return { beforeFiles: [{ source: '/', destination: '/home.html' }, { source: '/app', destination: '/index.html' }] };
  },
  async headers() {
    return [{ source: '/:file(index.html|home.html|app.js|styles.css|sw.js)', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }];
  },
};
