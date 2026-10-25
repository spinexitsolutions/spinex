"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Copy, Loader2, RefreshCw, TriangleAlert } from "lucide-react";

type Status = {
  metaUrl: string; googleUrl: string; canEdit: boolean;
  meta: { appSecret: boolean; verifyToken: boolean; pageToken: boolean }; google: { key: boolean };
  state: { lastMeta: string; lastMetaName: string; errorMeta: string; errorMetaAt: string; lastGoogle: string; lastGoogleName: string; errorGoogle: string; errorGoogleAt: string };
};
const when = (iso: string) => (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }) : "");

// Admin → Leads → Get leads from ads: webhook links, what's set up, and the steps for Meta and Google.
export default function AdLeadsSetup({ goApiKeys }: { goApiKeys?: () => void }) {
  const [s, setS] = useState<Status | null>(null);
  const [made, setMade] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"meta" | "google">("meta");
  const load = () => fetch("/api/admin/ad-leads", { cache: "no-store" }).then((r) => r.json()).then(setS).catch(() => setError("Couldn't load."));
  useEffect(() => { load(); }, []);
  const copy = (text: string, k: string) => navigator.clipboard?.writeText(text).then(() => { setCopied(k); setTimeout(() => setCopied(""), 2000); });
  const make = async (name: "META_VERIFY_TOKEN" | "GOOGLE_LEADS_KEY") => {
    setError("");
    const r = await fetch("/api/admin/ad-leads", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ make: name }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setError(d.error || "Couldn't make it.");
    setMade((m) => ({ ...m, [name]: d.value }));
    load();
  };
  if (!s) return <div className="grid place-items-center py-10 text-muted">{error || <Loader2 className="animate-spin" />}</div>;

  const Item = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => <li className="flex items-start gap-2">{ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-600" /> : <Circle size={17} className="mt-0.5 shrink-0 text-muted" />}<span>{children}</span></li>;
  const Url = ({ url, k }: { url: string; k: string }) => (
    <div className="flex gap-2"><input readOnly className="input font-mono text-xs" value={url} onFocus={(e) => e.target.select()} /><button onClick={() => copy(url, k)} className="btn-ghost shrink-0 px-3 text-sm"><Copy size={14} /> {copied === k ? "Copied" : "Copy"}</button></div>
  );
  const Made = ({ name }: { name: "META_VERIFY_TOKEN" | "GOOGLE_LEADS_KEY" }) => made[name] ? (
    <div className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Copy it now (it is saved, but shown only once): <div className="mt-1 flex gap-2"><input readOnly className="input font-mono text-xs" value={made[name]} onFocus={(e) => e.target.select()} /><button onClick={() => copy(made[name], name)} className="btn-ghost shrink-0 bg-white px-3 text-sm"><Copy size={14} /> {copied === name ? "Copied" : "Copy"}</button></div></div>
  ) : null;
  const ok = tab === "meta" ? s.meta.appSecret && s.meta.verifyToken && s.meta.pageToken : s.google.key;
  const last = tab === "meta" ? s.state.lastMeta : s.state.lastGoogle;
  const lastName = tab === "meta" ? s.state.lastMetaName : s.state.lastGoogleName;
  const err = tab === "meta" ? s.state.errorMeta : s.state.errorGoogle;
  const errAt = tab === "meta" ? s.state.errorMetaAt : s.state.errorGoogleAt;
  // A problem that was followed by a good lead is already fixed.
  const showErr = !!err && (!last || errAt > last);

  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted">Leads from Facebook / Instagram instant forms and Google Ads lead forms come straight into Leads, with the campaign and ad name. You get the same email and WhatsApp alert as for website enquiries.</p>
      <div className="flex gap-2">
        {([["meta", "Meta (Facebook / Instagram)"], ["google", "Google Ads"]] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 font-semibold ${tab === k ? "bg-ink text-white" : "bg-mist text-muted hover:text-ink"}`}>{l}</button>)}
        <button onClick={load} aria-label="Refresh" className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-line hover:border-ink"><RefreshCw size={14} /></button>
      </div>

      <div className={`rounded-2xl px-4 py-3 ${last ? "bg-emerald-50 text-emerald-800" : ok ? "bg-lav-100/60 text-lav-700" : "bg-mist text-muted"}`}>
        {last ? <>Working. Last lead: <b>{lastName}</b>, {when(last)}.</> : ok ? "Set up on this side. Send a test lead to check it." : "Not set up yet. Follow the steps below."}
      </div>
      {showErr && <p className="flex gap-2 rounded-2xl bg-red-50 px-4 py-3 text-red-700"><TriangleAlert size={16} className="mt-0.5 shrink-0" /><span><b>Last problem ({when(errAt)}):</b> {err}</span></p>}
      {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-red-700">{error}</p>}

      {tab === "meta" ? (
        <>
          <ul className="space-y-1.5">
            <Item ok={s.meta.appSecret}>App secret saved</Item>
            <Item ok={s.meta.verifyToken}>Verify token saved</Item>
            <Item ok={s.meta.pageToken}>Page access token saved</Item>
          </ul>
          <div><p className="mb-1 font-semibold">Callback URL for Meta</p><Url url={s.metaUrl} k="meta" /></div>
          <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
            <li>On <b>developers.facebook.com</b> create an app (type <i>Business</i>) and add the <b>Webhooks</b> product.</li>
            <li>App settings → Basic → copy the <b>App secret</b> and paste it in {s.canEdit && goApiKeys ? <button onClick={goApiKeys} className="font-semibold text-lav-700 underline">API keys</button> : "API keys"} → Leads from ads.</li>
            <li>{s.canEdit ? <button onClick={() => make("META_VERIFY_TOKEN")} className="btn-ghost px-3 py-1.5 text-xs">{s.meta.verifyToken ? "Make a new verify token" : "Make a verify token"}</button> : "Ask the owner to make a verify token"} and copy it.<Made name="META_VERIFY_TOKEN" /></li>
            <li>In the app → Webhooks → choose <b>Page</b> → Subscribe to this object. Paste the Callback URL above and the verify token, press <b>Verify and save</b>, then subscribe to the field <b>leadgen</b>.</li>
            <li>Make a <b>Page access token</b> that doesn&apos;t expire: Business settings → Users → System users → add one, give it your Page and the app, and generate a token with <i>leads_retrieval, pages_manage_metadata, pages_read_engagement, pages_show_list</i>. Use it to get the Page token (Graph API Explorer: <code>/PAGE_ID?fields=access_token</code>) and paste that in API keys.</li>
            <li>Connect the Page to the app: in Graph API Explorer with the Page token, send <b>POST</b> <code>/PAGE_ID/subscribed_apps?subscribed_fields=leadgen</code>. In Business settings → Integrations → <b>Leads access</b>, allow the app.</li>
            <li>Switch the app to <b>Live</b>. Test with Meta&apos;s <b>Lead Ads Testing Tool</b> (developers.facebook.com/tools/lead-ads-testing): create a test lead, and it appears in Leads in a few seconds.</li>
          </ol>
          <p className="text-xs text-muted">If the token stops working, leads are still saved with their Meta lead ID and you get an alert email. After you paste a new token, Meta&apos;s next retry fills in the details.</p>
        </>
      ) : (
        <>
          <ul className="space-y-1.5"><Item ok={s.google.key}>Webhook key saved</Item></ul>
          <div><p className="mb-1 font-semibold">Webhook URL for Google Ads</p><Url url={s.googleUrl} k="google" /></div>
          <ol className="list-decimal space-y-2 pl-5 leading-relaxed">
            <li>{s.canEdit ? <button onClick={() => make("GOOGLE_LEADS_KEY")} className="btn-ghost px-3 py-1.5 text-xs">{s.google.key ? "Make a new key" : "Make a webhook key"}</button> : "Ask the owner to make a webhook key"} and copy it.<Made name="GOOGLE_LEADS_KEY" /></li>
            <li>In Google Ads go to <b>Assets → Lead forms</b> (or the campaign&apos;s lead form asset) and open the form.</li>
            <li>Under <b>Lead delivery</b> / Export leads, choose <b>Webhook integration</b>. Paste the Webhook URL above and the key.</li>
            <li>Press <b>Send test data</b>. A lead marked TEST LEAD appears in Leads. Then save the form.</li>
          </ol>
          <p className="text-xs text-muted">Google shows campaign and ad group numbers, not names. Delete test leads after checking.</p>
        </>
      )}
    </div>
  );
}
