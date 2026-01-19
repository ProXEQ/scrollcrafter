// esbuild.config.mjs
import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isProd = process.env.NODE_ENV === 'production';

const shared = {
  bundle: true,
  sourcemap: !isProd,
  minify: isProd,
  target: ['es2018'],
  format: 'iife',
};

const configs = [
  {
    ...shared,
    entryPoints: ['assets/src/frontend/index.js'],
    outfile: 'assets/js/frontend.bundle.js',
  },
  {
    ...shared,
    entryPoints: ['assets/src/editor/scrollcrafter-editor.js'],
    outfile: 'assets/js/scrollcrafter-editor.js',
  },
  {
    ...shared,
    entryPoints: ['assets/src/editor/scrollcrafter-editor.css'],
    outfile: 'assets/css/scrollcrafter-editor.css',
  },
];

if (isWatch) {
  // watch wszystkie configi
  Promise.all(configs.map((cfg) => esbuild.context(cfg))).then((contexts) => {
    contexts.forEach((ctx) => ctx.watch());
  });
} else {
  Promise.all(configs.map((cfg) => esbuild.build(cfg))).catch(() => process.exit(1));
}
