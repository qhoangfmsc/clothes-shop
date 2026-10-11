/* ═══════════════════════════════════════════════════════════
   LEGAL MODULE TYPES — a document read from the message files

   Part of legal module _common/ — private to the legal pages.
   ═══════════════════════════════════════════════════════════ */

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
