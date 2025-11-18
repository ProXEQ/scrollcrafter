// esbuild.config.mjs
import * as esbuild from 'esbuild';

const isWatch = process.argv.includes('--watch');
const isProd = process.env.NODE_ENV === 'production';

const config = {
  entryPoints: ['assets/src/frontend/index.js'],
  bundle: true,
  sourcemap: !isProd,
  minify: isProd,
  outfile: 'assets/js/frontend.bundle.js',
  target: ['es2018'],
  format: 'iife',
};

if (isWatch) {
  esbuild.context(config).then((ctx) => ctx.watch());
} else {
  esbuild.build(config).catch(() => process.exit(1));
}
