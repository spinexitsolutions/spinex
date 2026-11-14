import { NextResponse } from "next/server";
import os from "node:os";
import { statfs } from "node:fs/promises";
import { guard } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

// The server's size and how much of it is in use (Admin → Dashboard → Server). The site runs in a Docker
// container, which sees the whole machine's processors, memory and disk.
export async function GET() {
  const deny = await guard("integrations", "view");
  if (deny) return deny;
  const gb = (b: number) => Math.round((b / 1024 ** 3) * 10) / 10;
  const cpus = os.cpus();
  let disk = { total: 0, free: 0 };
  try {
    const s = await statfs("/");
    disk = { total: s.blocks * s.bsize, free: s.bavail * s.bsize };
  } catch {
    /* not available */
  }
  // Memory the system can hand out right now (MemAvailable counts cache that can be freed), when we can read it.
  let available = os.freemem();
  try {
    const { readFile } = await import("node:fs/promises");
    const m = (await readFile("/proc/meminfo", "utf8")).match(/MemAvailable:\s+(\d+) kB/);
    if (m) available = Number(m[1]) * 1024;
  } catch {
    /* use freemem */
  }
  const total = os.totalmem();
  return NextResponse.json({
    cpu: { cores: cpus.length, model: cpus[0]?.model?.trim() ?? "", load: os.loadavg().map((x) => Math.round(x * 100) / 100) },
    memory: { totalGb: gb(total), usedGb: gb(total - available), freeGb: gb(available) },
    disk: { totalGb: gb(disk.total), usedGb: gb(disk.total - disk.free), freeGb: gb(disk.free) },
    uptimeDays: Math.round((os.uptime() / 86400) * 10) / 10,
    app: { memoryMb: Math.round(process.memoryUsage().rss / 1024 ** 2) },
  });
}
