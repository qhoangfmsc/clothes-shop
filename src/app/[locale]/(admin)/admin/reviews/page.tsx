import { Suspense } from "react";
import ReviewsContent from "./ReviewsContent";

export default function AdminReviewsPage() {
  return (
    <Suspense>
      <ReviewsContent />
    </Suspense>
  );
}
