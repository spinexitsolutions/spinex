// Kept separate from lib/content.ts so the home page only ships this small file.

// How a project is shown on the Work section. Empty = picked from the category.
export type ProjectDisplay = "website" | "social" | "video" | "ads" | "design" | "ecommerce" | "ondemand";
export const PROJECT_DISPLAYS: { value: ProjectDisplay; label: string }[] = [
  { value: "website", label: "Website / app (laptop + phone)" },
  { value: "social", label: "Social media (Instagram profile)" },
  { value: "video", label: "Video (player or reel)" },
  { value: "ads", label: "Ads / marketing / promotion (ad + results)" },
  { value: "design", label: "Graphic design (collage)" },
  { value: "ecommerce", label: "E-commerce management (seller dashboard)" },
  { value: "ondemand", label: "On-demand app (customer + admin + partner)" },
];

// Only the two fields this needs, so callers can pass any project-like object.
// Picks a frame from the category when the admin left "Show as" on Auto.
export function projectDisplay(p: { display?: ProjectDisplay | ""; category?: string }): ProjectDisplay {
  if (p.display) return p.display;
  const c = (p.category || "").toLowerCase();
  if (/e-?commerce management|marketplace|amazon|flipkart|meesho/.test(c)) return "ecommerce";
  if (/on-?demand|booking app|delivery app/.test(c)) return "ondemand";
  if (/social/.test(c)) return "social";
  if (/video|reel|film|edit/.test(c)) return "video";
  if (/design|logo|graphic|identity/.test(c)) return "design";
  if (/marketing|ads|seo|promotion|campaign|influencer/.test(c)) return "ads";
  return "website";
}

// Address of a project's case study page: /work/<slug>.
export const projectSlug = (p: { slug?: string; title?: string; id: string }) =>
  String(p.slug || p.title || p.id || "").toLowerCase().trim().replace(/^\/?(work\/)?/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || p.id;
