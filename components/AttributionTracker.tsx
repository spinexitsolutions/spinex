"use client";

import { useEffect } from "react";
import { captureVisit } from "@/lib/attribution";

// Remembers where this visitor came from (ad, search, Instagram…) so it can be saved with their enquiry.
export default function AttributionTracker() {
  useEffect(() => {
    captureVisit();
  }, []);
  return null;
}
