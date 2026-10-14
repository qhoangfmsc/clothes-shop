import { Suspense } from "react";
import ReviewsContent from "./ReviewsContent";

export default function ReviewsPage() {
  return (
    <Suspense>
      <ReviewsContent />
    </Suspense>
  );
}
