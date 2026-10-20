import { Suspense } from "react";
import { ResetForm } from "@/components/admin/PasswordReset";

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
