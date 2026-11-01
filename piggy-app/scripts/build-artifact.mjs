// Builds one self-contained HTML page for the claude.ai prototype.
// React loads from cdnjs (UMD globals); the app's own code and CSS are inlined.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const globals = { 'react': 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM', 'react/jsx-runtime': '__jsx' };
const globalsPlugin = {
  name: 'globals',
  setup(b) {
    b.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, a => ({ path: a.path, namespace: 'g' }));
    b.onLoad({ filter: /.*/, namespace: 'g' }, a => {
      if (a.path === 'react/jsx-runtime') {
        return { contents: `const R = window.React; export const jsx = (t,p,k)=>R.createElement(t, k===undefined?p:{...p,key:k}); export const jsxs = jsx; export const Fragment = R.Fragment;`, loader: 'js' };
      }
      return { contents: `module.exports = window.${globals[a.path]};`, loader: 'js' };
    });
  },
};

const res = await build({
  entryPoints: ['src/main.tsx'], bundle: true, write: false, minify: true, format: 'iife',
  target: ['safari15', 'chrome100'], plugins: [globalsPlugin], outdir: 'out',
  loader: { '.css': 'css' }, define: { 'process.env.NODE_ENV': '"production"', __PWA__: 'false' },
});
const js = res.outputFiles.find(f => f.path.endsWith('.js')).text.replace(/<\/script/gi, '<\\/script');
const css = res.outputFiles.find(f => f.path.endsWith('.css')).text;

const html = `<title>Piggy</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#FFFFFF">
<script>document.documentElement.dataset.palette = "lagoon";</script>
<style>${css}</style>
<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;
mkdirSync('dist-artifact', { recursive: true });
writeFileSync('dist-artifact/entrada.html', html);
console.log('artifact', (html.length / 1024).toFixed(1) + ' KB');
