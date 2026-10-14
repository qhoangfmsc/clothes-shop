import { Suspense } from "react";
import ReturnsContent from "./ReturnsContent";

export default function AdminReturnsPage() {
  return (
    <Suspense>
      <ReturnsContent />
    </Suspense>
  );
}
