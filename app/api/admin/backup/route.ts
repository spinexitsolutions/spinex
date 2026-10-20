import { getSession, guard } from "@/lib/admin-guard";
import { logActivity } from "@/lib/activity";
import { createBackup } from "@/lib/automation";

export const maxDuration = 60;

// Owner only: download the whole database (without images and API keys) as one .json.gz file.
export async function GET() {
  const deny = await guard("users");
  if (deny) return deny;
  const b = await createBackup();
  await logActivity(await getSession(), "Automation", "Downloaded a full backup", b.name);
  return new Response(new Uint8Array(b.file), {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${b.name}"`,
      "Cache-Control": "no-store",
    },
  });
}
