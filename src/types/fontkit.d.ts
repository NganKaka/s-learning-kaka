// `@pdf-lib/fontkit` ships no type declarations. Its default export is the
// fontkit instance accepted by pdf-lib's `registerFontkit`.
declare module '@pdf-lib/fontkit' {
  import type { Fontkit } from 'pdf-lib';
  const fontkit: Fontkit;
  export default fontkit;
}
