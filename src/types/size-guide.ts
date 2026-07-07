/* ── Size Guide Types ── */

export interface SizeGuideRow {
  size: string;
  bust?: string;
  waist?: string;
  hips?: string;
  length?: string;
  width?: string;
  height?: string;
  depth?: string;
  circumference?: string;
}

export interface SizeGuide {
  category: string;
  title: string;
  description: string;
  unit: "cm" | "inches";
  columns: string[];
  rows: SizeGuideRow[];
  tips: string[];
}
