import { Suspense } from "react";
import OrdersContent from "./OrdersContent";

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <OrdersContent />
    </Suspense>
  );
}
