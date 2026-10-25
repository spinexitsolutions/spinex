import { Download, FileText } from "lucide-react";
import { getClientSession } from "@/lib/client-auth";
import { listPortalFiles } from "@/lib/portal-db";
import { fileSizeText, shortDate, type PortalFile } from "@/lib/portal";
import PortalUpload from "@/components/portal/PortalUpload";

export default async function PortalFiles() {
  const client = (await getClientSession())!;
  const files = await listPortalFiles(client.id);
  const projectName = (id: string) => client.projects.find((p) => p.id === id)?.title ?? "";
  const fromTeam = files.filter((f) => f.by === "team");
  const mine = files.filter((f) => f.by === "client");
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Files</h1>
      <p className="mt-1 text-muted">Download what our team shares with you, and send us your logo, photos and content.</p>
      <h2 className="mt-8 font-display text-lg font-semibold">Send files to our team</h2>
      <div className="mt-3"><PortalUpload url="/api/portal/files" projects={client.projects.map((p) => ({ id: p.id, title: p.title }))} /></div>
      <List title="From our team" files={fromTeam} projectName={projectName} empty="No files shared yet." />
      <List title="Sent by you" files={mine} projectName={projectName} empty="You haven't sent any files yet." />
    </div>
  );
}

function List({ title, files, projectName, empty }: { title: string; files: PortalFile[]; projectName: (id: string) => string; empty: string }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {files.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line bg-white p-6 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-white">
          {files.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <FileText size={18} className="shrink-0 text-lav-700" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{f.name}</span>
                <span className="block truncate text-xs text-muted">{[fileSizeText(f.size), shortDate(f.uploadedAt), projectName(f.projectId), f.note].filter(Boolean).join(" · ")}</span>
              </span>
              <a href={`/api/portal/files/${f.id}`} className="btn-ghost px-4 py-2 text-sm"><Download size={14} /> Download</a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
