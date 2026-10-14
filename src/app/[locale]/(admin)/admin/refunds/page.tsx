import { Suspense } from "react";
import RefundsContent from "./RefundsContent";

export default function AdminRefundsPage() {
  return (
    <Suspense>
      <RefundsContent />
    </Suspense>
  );
}
