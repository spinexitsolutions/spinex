"use client";

import { motion } from "framer-motion";

// Fade between pages. Opacity only: a transform here would break fixed and sticky children.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
