import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { zipSync, strToU8 } from 'fflate';
import { isOriginAllowed } from './app.ts';
import { moveTableNotesOutside, pickMainFile, stripTypstTemplateWrappers } from './convert.ts';
import { findUnsafeLatexIncludes, findUnsafeTypstIncludes, isSafeRelativePath } from './pathSafety.ts';
import { ImportError, safeUnzip } from './zip.ts';

test('isSafeRelativePath recusa caminhos que escapam da pasta', () => {
  assert.equal(isSafeRelativePath('capitulos/intro.tex'), true);
  assert.equal(isSafeRelativePath('../segredo'), false);
  assert.equal(isSafeRelativePath('a/../../b'), false);
  assert.equal(isSafeRelativePath('/etc/passwd'), false);
  assert.equal(isSafeRelativePath('C:/Windows'), false);
  assert.equal(isSafeRelativePath('~/x'), false);
  assert.equal(isSafeRelativePath('a\\b'), false);
});

test('findUnsafeLatexIncludes detecta \\input absoluto, relativo para cima e via macro', () => {
  assert.deepEqual(findUnsafeLatexIncludes('\\input{capitulos/intro}\\include{cap2}'), []);
  assert.equal(findUnsafeLatexIncludes('\\input{/etc/passwd}').length, 1);
  assert.equal(findUnsafeLatexIncludes('\\input /proc/self/environ').length, 1);
  assert.equal(findUnsafeLatexIncludes('\\include{../../x}').length, 1);
  assert.equal(findUnsafeLatexIncludes('\\def\\x{/etc/passwd}\\input{\\x}').length, 1);
  assert.equal(findUnsafeLatexIncludes('\\bibliography{refs,../outro}').length, 1);
});

test('findUnsafeTypstIncludes só aceita literais seguros', () => {
  assert.deepEqual(findUnsafeTypstIncludes('#import "@preview/abnt:0.1.0": *\n#include "cap1.typ"'), []);
  assert.deepEqual(findUnsafeTypstIncludes('#image("figs/a.png")'), []);
  assert.equal(findUnsafeTypstIncludes('#read("../../etc/passwd")').length, 1);
  assert.equal(findUnsafeTypstIncludes('#read("/et" + "c/passwd")').length, 1);
  assert.deepEqual(findUnsafeTypstIncludes('#figure(image("a.png", width: 80%))'), []);
  assert.equal(findUnsafeTypstIncludes('#let p = "/etc"\n#read(p)').length, 1);
});

test('stripTypstTemplateWrappers remove import de pacote e show rule com parênteses aninhados', () => {
  const src = '#import "@preview/abnt:0.1.0": abnt\n#show: abnt.with(titulo: "A (b)", autores: ("x", "y"))\n= Introdução\nTexto';
  const out = stripTypstTemplateWrappers(src);
  assert.ok(!out.includes('@preview'));
  assert.ok(!out.includes('abnt.with'));
  assert.ok(out.includes('= Introdução'));
});

test('moveTableNotesOutside tira \\fonte{} de dentro do ambiente table', () => {
  const src =
    '\\begin{figure}\\legend{Fonte: A}\\end{figure}\n\\begin{table}[h]\n\\caption{T}\n\\begin{tabular}{l}x\\end{tabular}\n\\fonte{Dados {IBGE}.}\n\\end{table}';
  const out = moveTableNotesOutside(src);
  assert.ok(out.includes('\\begin{figure}\\legend{Fonte: A}\\end{figure}'), 'figura intacta');
  assert.match(out, /\\end\{table\}\n\\fonte\{Dados \{IBGE\}\.\}/);
});

test('pickMainFile prefere .tex com \\documentclass', () => {
  const texts: Record<string, string> = {
    'capitulos/intro.tex': '\\chapter{Intro}',
    'main.tex': '\\documentclass{abntex2}',
    'README.md': '# leia',
  };
  assert.equal(pickMainFile(Object.keys(texts), (f) => texts[f] ?? ''), 'main.tex');
  assert.equal(pickMainFile(['README.md', 'tcc.md'], () => ''), 'tcc.md');
  assert.equal(pickMainFile(['x/doc.docx'], () => ''), 'x/doc.docx');
});

test('isOriginAllowed aceita localhost, origens exatas e curingas', () => {
  const allowed = ['https://redija.app', 'https://*.vercel.app'];
  assert.equal(isOriginAllowed('http://localhost:5173', allowed), true);
  assert.equal(isOriginAllowed('https://redija.app', allowed), true);
  assert.equal(isOriginAllowed('https://redija-git-x.vercel.app', allowed), true);
  assert.equal(isOriginAllowed('https://evil.com', allowed), false);
  assert.equal(isOriginAllowed('https://a.b.vercel.app', allowed), false);
});

test('safeUnzip extrai arquivos e recusa zips grandes demais', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'redija-test-'));
  try {
    const zip = zipSync({ 'main.tex': strToU8('\\documentclass{article}'), 'figs/a.png': new Uint8Array(10) });
    const files = await safeUnzip(zip, dir, { maxEntries: 10, maxUnzippedBytes: 1024 });
    assert.deepEqual(files.sort(), ['figs/a.png', 'main.tex']);
    assert.deepEqual((await readdir(dir)).sort(), ['figs', 'main.tex']);

    const big = zipSync({ 'big.txt': new Uint8Array(4096) });
    await assert.rejects(safeUnzip(big, dir, { maxEntries: 10, maxUnzippedBytes: 1024 }), ImportError);
    await assert.rejects(safeUnzip(zip, dir, { maxEntries: 1, maxUnzippedBytes: 1024 }), ImportError);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
