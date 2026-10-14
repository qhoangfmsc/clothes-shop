import { Suspense } from "react";
import NewReturnContent from "./NewReturnContent";

export default function NewReturnPage() {
  return (
    <Suspense>
      <NewReturnContent />
    </Suspense>
  );
}
