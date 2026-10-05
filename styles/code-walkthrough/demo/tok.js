// A small syntax tokenizer for the code pane: no library. One line in, a list of {s, k} out.
// Roles (the style's syntax colours, STYLE.md §3): kw keyword, fn name being defined, call function being called, bi builtin,
// num number, str string, com comment, op operator/punctuation, id identifier, ws whitespace.
const KW = {
  py: new Set('def class return if elif else while for in not and or is import from as with try except finally raise pass break continue lambda yield None True False'.split(' ')),
  js: new Set('const let var function return if else while for of in new this class import export from async await try catch throw null undefined true false typeof'.split(' ')),
};
const BI = { py: new Set(['print', 'len', 'range', 'int', 'str', 'list', 'dict', 'min', 'max', 'sum']), js: new Set(['console', 'setTimeout', 'clearTimeout', 'Math', 'JSON', 'Promise']) };
export function tokenize(line, lang = 'py') {
  const out = [], n = line.length, com = lang === 'py' ? '#' : '//'; let i = 0, prev = '';
  while (i < n) {
    const c = line[i];
    if (c === ' ') { let j = i; while (line[j] === ' ') j++; out.push({ s: line.slice(i, j), k: 'ws' }); i = j; continue; }
    if (line.startsWith(com, i)) { out.push({ s: line.slice(i), k: 'com' }); break; }
    if (c === '"' || c === "'" || c === '`') { let j = i + 1; while (j < n && line[j] !== c) j += line[j] === '\\' ? 2 : 1; out.push({ s: line.slice(i, j + 1), k: 'str' }); i = j + 1; prev = ''; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (/[0-9._]/.test(line[j] || '')) j++; out.push({ s: line.slice(i, j), k: 'num' }); i = j; prev = ''; continue; }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i; while (/[A-Za-z0-9_$]/.test(line[j] || '')) j++; const w = line.slice(i, j); let k = 'id';
      if (KW[lang].has(w)) k = 'kw'; else if (prev === 'def' || prev === 'function') k = 'fn'; else if (BI[lang].has(w)) k = 'bi'; else if (line[j] === '(') k = 'call';
      out.push({ s: w, k }); prev = w; i = j; continue;
    }
    let j = i + 1; const two = line.slice(i, i + 2);
    if (['==', '<=', '>=', '!=', '//', '=>', '+=', '-=', '&&', '||', '**'].includes(two)) j = i + 2;
    out.push({ s: line.slice(i, j), k: 'op' }); i = j; prev = '';
  }
  return out;
}
