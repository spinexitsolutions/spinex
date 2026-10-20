// Server only: people a lead can be given to (owner + team members who can see leads).
import { usersCol } from "./users";
import { allowed, type Role } from "./roles";
import { smtpSettings } from "./notify";

export type TeamMember = { id: string; name: string; role: Role };

export async function leadTeam(): Promise<(TeamMember & { email: string })[]> {
  const out: (TeamMember & { email: string })[] = [];
  const { NOTIFY_EMAIL } = await smtpSettings().catch(() => ({ NOTIFY_EMAIL: "" }));
  out.push({ id: "env", name: "Owner", role: "owner", email: NOTIFY_EMAIL || process.env.ADMIN_EMAIL || "" });
  try {
    const users = await (await usersCol()).find({ active: { $ne: false } }, { projection: { name: 1, email: 1, role: 1, access: 1 } }).toArray();
    for (const u of users) {
      const role = (u.role ?? "editor") as Role;
      // Only people who can work on leads can be given one.
      if (allowed({ role, uid: String(u._id), access: u.access ?? null }, "leads", "edit")) out.push({ id: String(u._id), name: String(u.name || u.email), role, email: String(u.email || "") });
    }
  } catch (e) {
    console.error("Could not load team members:", e);
  }
  return out;
}
