import { Fragment } from "react";

/** Minimal, safe renderer for Sam's replies: paragraphs, bullet and numbered lists, **bold**, *italic*, `code`.
 *  Builds React elements only, never HTML strings, so model output can't inject markup. */
function inline(s: string, key: string) {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={`${key}b${i}`}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={`${key}c${i}`}>{t.slice(1, -1)}</code>);
    else out.push(<em key={`${key}i${i}`}>{t.slice(1, -1)}</em>);
    last = m.index + t.length; i++;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function Md({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: React.ReactNode[] = [];
  let para: string[] = [], list: { ordered: boolean; items: string[] } | null = null;
  const flushPara = () => { if (para.length) { blocks.push(<p key={`p${blocks.length}`}>{inline(para.join(" "), `p${blocks.length}`)}</p>); para = []; } };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul", k = `l${blocks.length}`;
    blocks.push(<Tag key={k}>{list.items.map((it, n) => <li key={n}>{inline(it, `${k}${n}`)}</li>)}</Tag>);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    const b = /^[-*•]\s+(.*)$/.exec(line), n = /^\d+[.)]\s+(.*)$/.exec(line), h = /^#{1,4}\s+(.*)$/.exec(line);
    if (!line) { flushPara(); flushList(); continue; }
    if (b || n) { flushPara(); const ordered = !!n; if (list && list.ordered !== ordered) flushList(); list = list ?? { ordered, items: [] }; list.items.push((b ?? n)![1]); continue; }
    flushList();
    if (h) { flushPara(); blocks.push(<p key={`h${blocks.length}`}><strong>{inline(h[1], `h${blocks.length}`)}</strong></p>); continue; }
    para.push(line);
  }
  flushPara(); flushList();
  return <Fragment>{blocks}</Fragment>;
}
