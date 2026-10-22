"use client";

import { Provider } from "react-redux";
import { store as appStore, type AppStore } from "./index";

export function StoreProvider({ children, store = appStore }: { children: React.ReactNode; store?: AppStore }) {
  return <Provider store={store}>{children}</Provider>;
}
