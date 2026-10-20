import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import InternshipContent from "@/components/InternshipContent";

export const metadata: Metadata = {
  title: "Internship",
  description: "Apply for an internship at Spinex IT Solutions, Jaipur: web development, graphic design, video editing, social media and digital marketing.",
};

export default function InternshipPage() {
  return (
    <>
      <PageHeader page="internship" title="Start your career with real projects." intro="Internships in web development, design, video, social media and marketing. Learn by doing, alongside our team." />
      <InternshipContent />
    </>
  );
}
