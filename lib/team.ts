// Server only: people a lead can be given to (owner + team members who can see leads).
import { usersCol } from "./users";
import { can, type Role } from "./roles";
import { smtpSettings } from "./notify";

export type TeamMember = { id: string; name: string; role: Role };

export async function leadTeam(): Promise<(TeamMember & { email: string })[]> {
  const out: (TeamMember & { email: string })[] = [];
  const { NOTIFY_EMAIL } = await smtpSettings().catch(() => ({ NOTIFY_EMAIL: "" }));
  out.push({ id: "env", name: "Owner", role: "owner", email: NOTIFY_EMAIL || process.env.ADMIN_EMAIL || "" });
  try {
    const users = await (await usersCol()).find({ active: { $ne: false } }, { projection: { name: 1, email: 1, role: 1 } }).toArray();
    for (const u of users) {
      const role = (u.role ?? "editor") as Role;
      if (can(role, "leads")) out.push({ id: String(u._id), name: String(u.name || u.email), role, email: String(u.email || "") });
    }
  } catch (e) {
    console.error("Could not load team members:", e);
  }
  return out;
}
