import { Suspense } from "react";
import ReturnsContent from "./ReturnsContent";

export default function ReturnsPage() {
  return (
    <Suspense>
      <ReturnsContent />
    </Suspense>
  );
}
