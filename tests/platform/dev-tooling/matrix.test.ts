import { describe, expect, it } from "vitest";
import { parseSpec, validateMatrix } from "@/scripts/quality-lib.mjs";

/* QG-6: the test matrix every spec must fill (situation × identity). Spec: specs/platform/dev-tooling.md. */

type Row = [id: string, situation: string, identity: string];

function section6(options: { scope?: string; dims?: string; rows?: Row[] } = {}) {
  const {
    scope = "**Phạm vi:** toàn module",
    dims = "**Chiều kiểm thử:** auth = không (hàm thuần) · permission = không (không có quyền)",
    rows = [
      ["A-1", "đúng", "—"],
      ["A-2", "lỗi", "—"],
    ],
  } = options;
  const table = rows.map(([id, situation, identity]) => `| ${id} | Luồng ${id} | ${situation} | ${identity} | unit | \`tests/x/a.test.ts\` |`);
  return [
    "# X — Tech spec",
    "",
    "> **Nhóm:** Platform · **Cập nhật:** 2026-10-21 · **Trạng thái:** Implemented",
    "",
    "## 6. Luồng sống còn & kế hoạch test",
    "",
    scope,
    dims,
    "",
    "| ID | Luồng | Tình huống | Danh tính | Tầng | Test |",
    "|---|---|---|---|---|---|",
    ...table,
    "",
    "## 7. Rủi ro & triển khai",
  ].join("\n");
}

const problems = (text: string) => validateMatrix(parseSpec(text)).join("\n");

const GUEST: Row = ["G-1", "đúng", "khách"];
const USER: Row = ["U-1", "đúng", "user"];
const FULL: Row = ["F-1", "đúng", "admin đủ quyền"];
const LIMITED: Row = ["L-1", "lỗi", "admin thiếu quyền"];
const ERR: Row = ["E-1", "lỗi", "—"];
const OK: Row = ["O-1", "đúng", "—"];

describe("parseSpec", () => {
  it("reads status, scope, dimensions and flow rows", () => {
    const parsed = parseSpec(
      section6({
        scope: "**Phạm vi:** một phần — chỉ phần phiên",
        dims: "**Chiều kiểm thử:** auth = có · permission = không (chỉ khách và user)",
        rows: [GUEST, ERR],
      })
    );

    expect(parsed.status).toBe("Implemented");
    expect(parsed.scope).toEqual({ full: false, note: "chỉ phần phiên" });
    expect(parsed.dims).toEqual({ auth: { has: true, reason: "" }, permission: { has: false, reason: "chỉ khách và user" } });
    expect(parsed.rows.map((r: { id: string; situation: string; identity: string }) => [r.id, r.situation, r.identity])).toEqual([
      ["G-1", "đúng", "khách"],
      ["E-1", "lỗi", "—"],
    ]);
  });

  it("keeps a reason that itself contains parentheses", () => {
    const parsed = parseSpec(section6({ dims: "**Chiều kiểm thử:** auth = không (công cụ (build) và test) · permission = không (không có)" }));

    expect(parsed.dims?.auth).toEqual({ has: false, reason: "công cụ (build) và test" });
  });
});

describe("QG-6 a complete matrix", () => {
  it("accepts a module without identity dimensions that has a right and an error flow", () => {
    expect(problems(section6())).toBe("");
  });

  it("accepts auth = có with guest and signed-in flows", () => {
    expect(problems(section6({ dims: "**Chiều kiểm thử:** auth = có · permission = không (không có quyền)", rows: [OK, ERR, GUEST, USER] }))).toBe("");
  });

  it("accepts permission = có with allowed and denied admins", () => {
    expect(problems(section6({ dims: "**Chiều kiểm thử:** auth = có · permission = có", rows: [OK, ERR, GUEST, FULL, LIMITED] }))).toBe("");
  });
});

describe("QG-6 header lines", () => {
  it("requires the scope line", () => {
    expect(problems(section6({ scope: "" }))).toContain('missing the "**Phạm vi:**" line');
  });

  it("rejects an unknown scope", () => {
    expect(problems(section6({ scope: "**Phạm vi:** một nửa" }))).toContain('"Phạm vi" must be "toàn module" or "một phần — <what is covered>"');
  });

  it("requires a note after 'một phần'", () => {
    expect(problems(section6({ scope: "**Phạm vi:** một phần" }))).toContain('"Phạm vi" must be');
  });

  it("requires the dimensions line", () => {
    expect(problems(section6({ dims: "" }))).toContain('missing the "**Chiều kiểm thử:**" line');
  });

  it("rejects a dimensions line it cannot read", () => {
    expect(problems(section6({ dims: "**Chiều kiểm thử:** auth yes" }))).toContain('"Chiều kiểm thử" must read');
  });

  it("demands a reason when a dimension is 'không'", () => {
    expect(problems(section6({ dims: "**Chiều kiểm thử:** auth = không · permission = không (không có quyền)" }))).toContain('auth = không needs a reason in parentheses');
    expect(problems(section6({ dims: "**Chiều kiểm thử:** auth = không (hàm thuần) · permission = không" }))).toContain('permission = không needs a reason in parentheses');
  });
});

describe("QG-6 required cells", () => {
  it("needs a right flow and an error flow", () => {
    expect(problems(section6({ rows: [ERR] }))).toContain('needs at least one "đúng" flow');
    expect(problems(section6({ rows: [OK] }))).toContain('needs at least one "lỗi" flow');
  });

  it("with auth = có, needs a guest flow", () => {
    expect(problems(section6({ dims: "**Chiều kiểm thử:** auth = có · permission = không (không có quyền)", rows: [OK, ERR, USER] }))).toContain('auth = có needs a "khách" flow');
  });

  it("with auth = có, needs a signed-in flow", () => {
    expect(problems(section6({ dims: "**Chiều kiểm thử:** auth = có · permission = không (không có quyền)", rows: [OK, ERR, GUEST] }))).toContain("auth = có needs a flow for a signed-in identity");
  });

  it("counts an admin flow as signed-in", () => {
    expect(problems(section6({ dims: "**Chiều kiểm thử:** auth = có · permission = không (không có quyền)", rows: [OK, ERR, GUEST, FULL] }))).toBe("");
  });

  it("with permission = có, needs both an allowed and a denied admin", () => {
    const dims = "**Chiều kiểm thử:** auth = có · permission = có";
    expect(problems(section6({ dims, rows: [OK, ERR, GUEST, LIMITED] }))).toContain('permission = có needs a "admin đủ quyền" flow');
    expect(problems(section6({ dims, rows: [OK, ERR, GUEST, FULL] }))).toContain('permission = có needs a "admin thiếu quyền" flow');
  });

  it("permission = có is meaningless without auth = có", () => {
    expect(problems(section6({ dims: "**Chiều kiểm thử:** auth = không (công khai) · permission = có", rows: [OK, ERR, FULL, LIMITED] }))).toContain("permission = có needs auth = có");
  });
});

describe("QG-6 flow rows", () => {
  it("rejects an unknown situation", () => {
    expect(problems(section6({ rows: [OK, ERR, ["B-1", "tạm", "—"]] }))).toContain('flow B-1 has situation "tạm"');
  });

  it("rejects an unknown identity", () => {
    expect(problems(section6({ rows: [OK, ERR, ["B-1", "đúng", "quản lý"]] }))).toContain('flow B-1 has identity "quản lý"');
  });

  it("rejects the old four-column table", () => {
    const old = section6().replace("| ID | Luồng | Tình huống | Danh tính | Tầng | Test |", "| ID | Luồng | Tầng | Test |").replace(/\| (A-\d) \| Luồng A-\d \| \S+ \| — \| unit \|/g, "| $1 | Luồng | unit |");

    expect(problems(old)).toContain('needs the columns "Tình huống" and "Danh tính"');
  });
});
