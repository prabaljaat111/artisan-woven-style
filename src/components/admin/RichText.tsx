import { useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { Bold, Italic, Underline, List, ListOrdered, Link2, Eraser } from "lucide-react";

const ALLOWED = { ALLOWED_TAGS: ["p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "a", "h3", "h4"], ALLOWED_ATTR: ["href", "target", "rel"] };
export const sanitizeHtml = (html: string) => DOMPurify.sanitize(html, ALLOWED) as string;

export function RichText({ value, onChange, placeholder, minHeight = 120, invalid }: { value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number; invalid?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(sanitizeHtml(ref.current?.innerHTML ?? ""));
  };
  const tools = [
    { icon: Bold, cmd: "bold", label: "Bold" }, { icon: Italic, cmd: "italic", label: "Italic" }, { icon: Underline, cmd: "underline", label: "Underline" },
    { icon: List, cmd: "insertUnorderedList", label: "Bullet list" }, { icon: ListOrdered, cmd: "insertOrderedList", label: "Numbered list" },
  ];
  return (
    <div className={`rounded-lg border bg-card ${invalid ? "border-status-red" : "border-border"}`}>
      <div className="flex gap-0.5 p-1 border-b border-border">
        {tools.map((t) => <button key={t.cmd} type="button" aria-label={t.label} onMouseDown={(e) => { e.preventDefault(); exec(t.cmd); }} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><t.icon className="h-4 w-4" /></button>)}
        <button type="button" aria-label="Link" onMouseDown={(e) => { e.preventDefault(); const u = prompt("Link URL"); if (u && /^https?:\/\//.test(u)) exec("createLink", u); }} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><Link2 className="h-4 w-4" /></button>
        <button type="button" aria-label="Clear formatting" onMouseDown={(e) => { e.preventDefault(); exec("removeFormat"); }} className="h-8 w-8 grid place-items-center rounded hover:bg-secondary"><Eraser className="h-4 w-4" /></button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={() => onChange(sanitizeHtml(ref.current?.innerHTML ?? ""))}
        className="rte px-3 py-2 text-sm outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
        style={{ minHeight }}
      />
    </div>
  );
}

export function htmlToText(html: string) {
  return html.replace(/<br\s*\/?>/gi, " ").replace(/<\/(p|li|h3|h4)>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}
