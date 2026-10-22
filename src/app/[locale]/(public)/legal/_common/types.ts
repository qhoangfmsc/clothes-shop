import type { LegalDocKey } from "@/src/lib/legal";

export type LegalBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

export interface LegalSection {
  key: string;
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocumentContent {
  key: LegalDocKey;
  title: string;
  intro: string;
  sections: LegalSection[];
}
