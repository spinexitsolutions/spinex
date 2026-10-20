import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyCertificate from "@/components/VerifyCertificate";

export const metadata: Metadata = { title: "Verify a certificate", description: "Check whether a Spinex IT Solutions internship certificate is genuine." };

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyCertificate />
    </Suspense>
  );
}
