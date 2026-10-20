"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, Bold, Eye, FilePlus2, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Minus,
  Newspaper, Pencil, Quote, RefreshCw, Search, Trash2, ExternalLink,
} from "lucide-react";
import { blankPost, readingMinutes, renderMarkdown, slugify, type Post } from "@/lib/posts";
import { formatDate } from "@/lib/interns";
import ImageField from "./ImageField";
import MediaLibrary from "./MediaLibrary";
import Modal from "./Modal";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Please log in again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data as T;
}

export default function PostsManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Post | null>(null);
  const [opening, setOpening] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPosts(await api<Post[]>("/api/admin/posts"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load posts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (p: Post) => {
    setOpening(p.id);
    try {
      setEditing(await api<Post>(`/api/admin/posts/${p.id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open the post.");
    } finally {
      setOpening("");
    }
  };

  if (editing) {
    return (
      <PostEditor
        initial={editing}
        onBack={() => {
          setEditing(null);
          load();
        }}
      />
    );
  }

  const list = posts.filter((p) => (filter === "all" || p.status === filter) && (!query.trim() || `${p.title} ${p.category} ${p.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())));
  const count = (s: "published" | "draft") => posts.filter((p) => p.status === s).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-white p-3">
        {(["all", "published", "draft"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`min-h-10 rounded-full px-4 text-sm font-medium ${filter === f ? "bg-ink text-white" : "text-muted hover:bg-mist hover:text-ink"}`}>
            {f === "all" ? `All (${posts.length})` : f === "published" ? `Published (${count("published")})` : `Drafts (${count("draft")})`}
          </button>
        ))}
        <label className="ml-auto flex min-w-[200px] flex-1 items-center gap-2 rounded-xl bg-mist px-3 sm:flex-none">
          <Search size={16} className="text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts" className="h-10 w-full bg-transparent text-sm outline-none" aria-label="Search posts" />
        </label>
        <button onClick={load} aria-label="Refresh" className="grid h-10 w-10 place-items-center rounded-full border border-line hover:border-ink"><RefreshCw size={15} /></button>
        <button onClick={() => setEditing(blankPost())} className="btn-dark px-4 py-2.5 text-sm"><FilePlus2 size={16} /> New post</button>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

      {loading ? (
        <div className="grid place-items-center rounded-3xl border border-line bg-white p-16 text-muted"><Loader2 className="animate-spin" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white p-12 text-center">
          <Newspaper className="mx-auto text-lav-600" size={32} />
          <p className="mt-3 font-semibold">No posts yet</p>
          <p className="mt-1 text-sm text-muted">Articles help people find you on Google. Write your first one.</p>
          <button onClick={() => setEditing(blankPost())} className="btn-dark mt-5"><FilePlus2 size={16} /> Write a post</button>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-3 pr-4">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-mist">{p.cover && <img src={p.cover} alt="" className="h-full w-full object-cover" />}</div>
              <button onClick={() => open(p)} className="min-w-[200px] flex-1 text-left">
                <span className="block font-semibold">{p.title}</span>
                <span className="text-sm text-muted">{[p.category, p.status === "published" ? `Published ${formatDate(p.publishedAt)}` : `Edited ${formatDate(p.updatedAt.slice(0, 10))}`].filter(Boolean).join(" · ")}</span>
              </button>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.status === "published" ? "bg-emerald-50 text-emerald-800" : "bg-mist text-muted"}`}>{p.status === "published" ? "Published" : "Draft"}</span>
              {p.status === "published" && <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" aria-label="View on website" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink"><ExternalLink size={16} /></a>}
              <button onClick={() => open(p)} aria-label={`Edit ${p.title}`} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-mist hover:text-ink">{opening === p.id ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}</button>
            </div>
          ))}
          {list.length === 0 && <p className="rounded-2xl bg-white p-6 text-center text-muted">No posts match.</p>}
        </div>
      )}
    </div>
  );
}

function PostEditor({ initial, onBack }: { initial: Post; onBack: () => void }) {
  const [post, setPost] = useState<Post>(initial);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [library, setLibrary] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const savedJson = useRef(JSON.stringify(initial));
  const dirty = JSON.stringify(post) !== savedJson.current;

  const set = <K extends keyof Post>(k: K, v: Post[K]) => setPost((p) => ({ ...p, [k]: v }));
  const preview = useMemo(() => renderMarkdown(post.body).html, [post.body]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
    };
  }, [dirty]);

  // Wraps the selection (or inserts a template) in the body textarea.
  const insert = (before: string, after = "", placeholder = "text") => {
    const el = area.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const chosen = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + chosen + after + value.slice(e);
    set("body", next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + chosen.length);
    });
  };
  const line = (prefix: string, placeholder: string) => {
    const el = area.current;
    if (!el) return;
    const atLineStart = el.selectionStart === 0 || el.value[el.selectionStart - 1] === "\n";
    insert(`${atLineStart ? "" : "\n\n"}${prefix}`, "", placeholder);
  };

  const save = async (status?: Post["status"]) => {
    if (!post.title.trim()) {
      setError("Add a title first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = { ...post, status: status ?? post.status };
      const saved = post.id
        ? await api<Post>(`/api/admin/posts/${post.id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await api<Post>("/api/admin/posts", { method: "POST", body: JSON.stringify(body) });
      setPost(saved);
      savedJson.current = JSON.stringify(saved);
      setSlugTouched(true);
      setMsg(status === "published" && post.status !== "published" ? "Published. It's live on the website." : status === "draft" && post.status === "published" ? "Moved back to drafts." : "Saved");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!post.id) return onBack();
    if (!confirm("Delete this post? This can't be undone.")) return;
    await api(`/api/admin/posts/${post.id}`, { method: "DELETE" }).catch(() => undefined);
    onBack();
  };

  // Puts an image line at the cursor, on its own paragraph.
  const insertImage = (url: string) => {
    const el = area.current;
    const v = post.body;
    const s = el?.selectionStart ?? v.length;
    const e = el?.selectionEnd ?? s;
    const alt = v.slice(s, e).trim() || "Image description";
    const before = v.slice(0, s);
    const gap = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    set("body", `${before}${gap}![${alt}](${url})\n\n${v.slice(e)}`);
  };

  const tools = [
    { label: "Heading", Icon: Heading2, run: () => line("## ", "Section heading") },
    { label: "Sub-heading", Icon: Heading3, run: () => line("### ", "Sub-heading") },
    { label: "Bold", Icon: Bold, run: () => insert("**", "**", "bold text") },
    { label: "Italic", Icon: Italic, run: () => insert("*", "*", "italic text") },
    { label: "Link", Icon: Link2, run: () => insert("[", "](https://)", "link text") },
    { label: "Bullet list", Icon: List, run: () => line("- ", "List item") },
    { label: "Numbered list", Icon: ListOrdered, run: () => line("1. ", "First step") },
    { label: "Quote", Icon: Quote, run: () => line("> ", "Quote") },
    { label: "Divider", Icon: Minus, run: () => line("---\n\n", "") },
    { label: "Image", Icon: ImagePlus, run: () => setLibrary(true) },
  ];

  const seoTitle = post.seoTitle || post.title;
  const seoDesc = post.seoDescription || post.excerpt;

  return (
    <div className="space-y-5">
      <div className="sticky top-[73px] z-10 -mx-5 flex flex-wrap items-center gap-2 border-b border-line bg-mist/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button onClick={() => { if (!dirty || confirm("Leave without saving your changes?")) onBack(); }} className="btn-ghost bg-white px-4 py-2 text-sm"><ArrowLeft size={15} /> All posts</button>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${post.status === "published" ? "bg-emerald-50 text-emerald-800" : "bg-white text-muted"}`}>{post.status === "published" ? "Published" : "Draft"}</span>
        {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
        <AnimatePresence>{msg && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium text-emerald-700" role="status">{msg}</motion.span>}</AnimatePresence>
        <div className="ml-auto flex flex-wrap gap-2">
          {post.status === "published" && post.slug && <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="btn-ghost bg-white px-4 py-2 text-sm"><ExternalLink size={15} /> View</a>}
          <button onClick={() => save()} disabled={saving} className="btn-ghost bg-white px-4 py-2 text-sm disabled:opacity-60">{saving ? <Loader2 size={15} className="animate-spin" /> : "Save"}</button>
          {post.status === "published" ? (
            <button onClick={() => save("draft")} disabled={saving} className="btn-ghost bg-white px-4 py-2 text-sm">Unpublish</button>
          ) : (
            <button onClick={() => save("published")} disabled={saving} className="btn-dark px-4 py-2 text-sm">Publish</button>
          )}
        </div>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <input
            value={post.title}
            onChange={(e) => {
              const title = e.target.value;
              setPost((p) => ({ ...p, title, slug: slugTouched ? p.slug : slugify(title) }));
            }}
            placeholder="Post title"
            aria-label="Post title"
            className="w-full rounded-2xl border border-line bg-white px-5 py-4 font-display text-3xl font-semibold tracking-tight outline-none focus:border-lav-500"
          />
          <textarea value={post.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="Short summary (shown on cards and under the title)" aria-label="Summary" className="input min-h-[80px] resize-y" />

          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-1 border-b border-line p-2">
              {tab === "write" && tools.map(({ label, Icon, run }) => (
                <button key={label} type="button" onClick={run} title={label} aria-label={label} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-mist hover:text-ink"><Icon size={16} /></button>
              ))}
              <div className="ml-auto flex rounded-full bg-mist p-1">
                {(["write", "preview"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-white shadow-sm" : "text-muted"}`}>
                    {t === "write" ? <Pencil size={13} /> : <Eye size={13} />} {t === "write" ? "Write" : "Preview"}
                  </button>
                ))}
              </div>
            </div>
            {tab === "write" ? (
              <textarea
                ref={area}
                value={post.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder={"Start writing…\n\n## Use headings to split the article\n\nWrite short paragraphs. Use **bold** for key points and add images with the image button."}
                aria-label="Article text"
                className="min-h-[520px] w-full resize-y p-5 font-mono text-[15px] leading-relaxed outline-none"
              />
            ) : (
              <div className="prose-spinex min-h-[520px] p-6" dangerouslySetInnerHTML={{ __html: preview || "<p>Nothing to preview yet.</p>" }} />
            )}
            <p className="border-t border-line px-4 py-2 text-xs text-muted">{post.body.split(/\s+/).filter(Boolean).length} words · {readingMinutes(post.body)} min read</p>
          </div>
        </div>

        <aside className="space-y-5">
          <Panel title="Cover image">
            <ImageField id="post-cover" value={post.cover} onChange={(v) => set("cover", v)} />
          </Panel>
          <Panel title="Details">
            <Field label="Web address">
              <div className="flex items-center rounded-xl border border-line bg-white pl-3 text-sm focus-within:border-lav-500">
                <span className="text-muted">/blog/</span>
                <input value={post.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} className="h-11 w-full bg-transparent pr-3 outline-none" aria-label="Web address" />
              </div>
            </Field>
            <Field label="Category"><input className="input" value={post.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Websites" /></Field>
            <Field label="Tags" hint="comma separated"><input className="input" value={post.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} /></Field>
            <Field label="Author"><input className="input" value={post.author} onChange={(e) => set("author", e.target.value)} /></Field>
            <Field label="Publish date" hint="future date = scheduled"><input className="input" type="date" value={post.publishedAt} onChange={(e) => set("publishedAt", e.target.value)} /></Field>
          </Panel>
          <Panel title="Google search">
            <div className="rounded-xl border border-line p-3">
              <p className="truncate text-xs text-muted">spinexwebsolutions.in/blog/{post.slug}</p>
              <p className="mt-0.5 line-clamp-2 text-[15px] text-[#1a0dab]">{seoTitle || "Post title"}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{seoDesc || "Add a summary or SEO description."}</p>
            </div>
            <Field label="SEO title" hint={`${seoTitle.length}/60`}><input className="input" value={post.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} placeholder="Uses the post title if empty" /></Field>
            <Field label="SEO description" hint={`${seoDesc.length}/160`}><textarea className="input min-h-[80px]" value={post.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} placeholder="Uses the summary if empty" /></Field>
          </Panel>
          <button onClick={remove} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-red-600 hover:bg-red-50"><Trash2 size={15} /> Delete post</button>
        </aside>
      </div>

      <Modal open={library} title="Insert an image" onClose={() => setLibrary(false)} wide>
        <MediaLibrary
          onPick={(url) => {
            setLibrary(false);
            insertImage(url);
          }}
        />
      </Modal>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-line bg-white p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-[13px] font-medium">{label}{hint && <span className="font-normal text-muted">{hint}</span>}</span>
      {children}
    </label>
  );
}
