import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasDb } from "@/lib/db";
import { getContent } from "@/lib/content-server";
import { linkState, maskPhone } from "@/lib/demos";
import { demoOid, linksCol, toLink, toVideo, videosCol } from "@/lib/demos-db";
import DemoPlayer from "@/components/demo/DemoPlayer";

// A client's private demo video: /v/<secret token> from the link the owner shared.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private demo", robots: { index: false, follow: false, nocache: true } };

export default async function DemoPage({ params }: { params: { token: string } }) {
  const token = String(params.token || "");
  if (!hasDb() || !/^[A-Za-z0-9_-]{8,40}$/.test(token)) notFound();
  const doc = await (await linksCol()).findOne({ token });
  if (!doc) notFound();
  const link = toLink(doc);
  const vid = demoOid(link.videoId);
  const vdoc = vid ? await (await videosCol()).findOne({ _id: vid }) : null;
  if (!vdoc) notFound();
  const video = toVideo(vdoc);
  const content = await getContent();
  const state = link.revoked ? "revoked" : linkState(link);
  return (
    <DemoPlayer
      token={token}
      brand={content.brand.name || "Spinex IT Solutions"}
      logo={content.brand.logo || ""}
      whatsapp={content.contact?.whatsapp || ""}
      title={video.title}
      client={link.client}
      phone={maskPhone(link.phone)}
      showName={link.showName}
      needsPin={!!link.pin}
      expiresAt={link.expiresAt}
      viewsLeft={link.maxViews ? Math.max(0, link.maxViews - link.views) : null}
      portrait={video.height > video.width}
      state={video.status !== "ready" ? "notready" : state}
    />
  );
}
