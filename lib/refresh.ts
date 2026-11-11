import { revalidatePath, revalidateTag } from "next/cache";

// Called after anything in the admin panel is saved. Clearing the data tag alone was not enough: pages that
// were built from an already-cached copy of the content kept showing the old version for minutes. So the
// whole site's built pages are marked stale too, and the next visit to any page shows the saved change.
export function refreshSite(tag: string) {
  revalidateTag(tag);
  revalidatePath("/", "layout");
}
