import { Suspense } from "react";
import PaymentsContent from "./PaymentsContent";

export default function AdminPaymentsPage() {
  return (
    <Suspense>
      <PaymentsContent />
    </Suspense>
  );
}
