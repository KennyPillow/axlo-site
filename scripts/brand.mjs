// Gera as versões web da logo a partir dos SVGs oficiais (_brand/svg, fora do git):
// tira o retângulo branco de fundo, recorta o viewBox no desenho e extrai o símbolo X.
// Rodar só quando a Axlo mandar logo nova: node scripts/brand.mjs
import fs from 'node:fs';

const SRC = '_brand/svg/';
const OUT = 'src/assets/brand/';
fs.mkdirSync(OUT, { recursive: true });

// caixas medidas no navegador (getBBox), em unidades do viewBox original
const HORIZONTAL = '-1 127.4 368.7 68.9';
const EMPILHADA = '4.6 95.9 350.5 148.8';
const X_BOX = { x: 64.15, y: 129.59, w: 57.24, h: 63.8 };

const read = f => fs.readFileSync(SRC + f, 'utf8');

function clean(svg, viewBox) {
  return svg
    .replace(/<rect x="-37\.5"[^>]*fill="#ffffff"[^>]*\/>/g, '')
    .replace(/ width="500"| height="500"| zoomAndPan="magnify"/g, '')
    .replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`)
    .replace('<svg ', '<svg role="img" aria-label="AXLO Health &amp; Insurance" ');
}

// devolve os blocos <g fill="..."> de primeiro nível do desenho (um por letra)
function fillGroups(svg) {
  const groups = [];
  const re = /<g fill="#[0-9a-f]{6}" fill-opacity="1">/gi;
  let m;
  while ((m = re.exec(svg))) {
    let depth = 0, i = m.index;
    const tag = /<\/?g\b[^>]*?(\/?)>/g;
    tag.lastIndex = i;
    let t;
    while ((t = tag.exec(svg))) {
      if (t[0].startsWith('</')) depth--;
      else if (!t[1]) depth++;
      if (depth === 0) { groups.push({ start: i, end: tag.lastIndex }); break; }
    }
    re.lastIndex = tag.lastIndex;
  }
  return groups;
}

function symbolX(svg, fill) {
  const groups = fillGroups(svg);
  // a ordem é A, X, L, O e depois as letras da tagline; mantém só o X
  let out = '';
  let last = 0;
  groups.forEach((g, i) => {
    out += svg.slice(last, g.start);
    if (i === 1) out += svg.slice(g.start, g.end).replace(/fill="#[0-9a-f]{6}"/i, `fill="${fill}"`);
    last = g.end;
  });
  out += svg.slice(last);
  const p = 0.5;
  return clean(out, `${X_BOX.x - p} ${X_BOX.y - p} ${X_BOX.w + p * 2} ${X_BOX.h + p * 2}`)
    .replace('aria-label="AXLO Health &amp; Insurance"', 'aria-label="AXLO"');
}

const files = {
  'axlo-horizontal.svg': clean(read('2.svg'), HORIZONTAL),
  'axlo-horizontal-branca.svg': clean(read('3.svg'), HORIZONTAL),
  // negativa horizontal (AXLO branco + tagline lilás) para fundos índigo e noite, como pede o brand book
  'axlo-horizontal-negativa.svg': clean(read('2.svg').replaceAll('#280f91', '#ffffff'), HORIZONTAL),
  'axlo-empilhada.svg': clean(read('4.svg'), EMPILHADA),
  'axlo-empilhada-negativa.svg': clean(read('5.svg'), EMPILHADA),
  'axlo-x.svg': symbolX(read('2.svg'), '#280f91'),
  'axlo-x-branco.svg': symbolX(read('2.svg'), '#ffffff'),
};
for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(OUT + name, svg);
  console.log(name.padEnd(30), (svg.length / 1024).toFixed(1), 'KB');
}
if (fillGroups(read('2.svg')).length !== 21) console.warn('atenção: o SVG 2 não tem 21 grupos; confira o símbolo X');
