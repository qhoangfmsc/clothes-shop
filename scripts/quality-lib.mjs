/* Pure checks behind check-quality.mjs. Each returns a list of problems (empty = fine). */

export const SPEC_HEADINGS = [
  "## 1. Bối cảnh & mục tiêu",
  "## 2. Phạm vi",
  "## 3. Hợp đồng",
  "## 4. Thiết kế",
  "## 5. Quyết định thiết kế",
  "## 6. Luồng sống còn & kế hoạch test",
  "## 7. Rủi ro & triển khai",
  "## 8. Lịch sử thay đổi",
];
export const DESIGN_SUBHEADINGS = ["### Design pattern", "### Kiến trúc", "### SOLID", "### Conventions"];
export const SPEC_STATUSES = ["Draft", "Approved", "Implemented"];
export const FLOW_TIERS = ["P0", "P1"];

/** A test file inside `tests/<module>/`: Vitest (`*.test.ts(x)`) or Playwright (`*.e2e.ts`). */
/** A change may waive a check by logging `<tag>: <reason>` in a spec's history (tags: `no-test`, `baseline-grow`). */
export const hasWaiver = (diff, tag) => new RegExp(`^\\+.*${tag}:\\s*\\S`, "m").test(diff);

export const TEST_FILE = /\.(test\.tsx?|e2e\.ts)$/;

const TEST_PATH = /`(tests\/[^`\s]+)`/g;
const SEPARATOR_ROW = /^\|[\s:|-]+\|$/;

const testPathsIn = (text) => [...text.matchAll(TEST_PATH)].map((m) => m[1]);

/** Body of the section that starts at line `from`, up to the next heading of the same or a higher level. */
function sectionBody(lines, from, level) {
  const stop = new RegExp(`^#{1,${level}} `);
  let end = lines.length;
  for (let i = from + 1; i < lines.length; i++) {
    if (stop.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(from + 1, end);
}

const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

/** The first markdown table in `body`: its header cells and its data rows (separator excluded), as arrays of cells. */
function parseTable(body) {
  const lines = body.filter((l) => l.trim().startsWith("|") && !SEPARATOR_ROW.test(l.trim()));
  return { header: lines.length ? splitRow(lines[0]) : [], rows: lines.slice(1).map(splitRow) };
}

const tableRows = (body) => parseTable(body).rows;

export const SITUATIONS = ["đúng", "lỗi"];
export const IDENTITIES = ["khách", "user", "admin đủ quyền", "admin thiếu quyền", "—"];
const SIGNED_IN = ["user", "admin đủ quyền", "admin thiếu quyền"];
const SECTION_6 = "## 6. Luồng sống còn & kế hoạch test";

function parseDimension(part, name) {
  const m = new RegExp(`^${name} = (có|không)(?: \\((.*)\\))?$`).exec(part.trim());
  return m ? { has: m[1] === "có", reason: (m[2] ?? "").trim() } : null;
}

/** Reads a spec into status, scope, auth/permission dimensions and flow rows. Validates nothing. */
export function parseSpec(text) {
  const lines = text.split("\n");
  const header = lines.slice(0, 8).join("\n");
  const status = /\*\*Trạng thái:\*\* (\S+)/.exec(header)?.[1] ?? null;

  const at = lines.findIndex((l) => l.trim() === SECTION_6);
  const body = at < 0 ? [] : sectionBody(lines, at, 2);
  const lineOf = (label) => body.find((l) => l.trim().startsWith(`**${label}:**`))?.trim().slice(`**${label}:**`.length).trim() ?? null;

  const scopeRaw = lineOf("Phạm vi");
  let scope = null;
  if (scopeRaw === "toàn module") scope = { full: true, note: "" };
  else {
    const partial = /^một phần\s*[—-]\s*(\S.*)$/.exec(scopeRaw ?? "");
    if (partial) scope = { full: false, note: partial[1].trim() };
  }

  const dimsRaw = lineOf("Chiều kiểm thử");
  let dims = null;
  const parts = (dimsRaw ?? "").split(" · ");
  if (parts.length === 2) {
    const auth = parseDimension(parts[0], "auth");
    const permission = parseDimension(parts[1], "permission");
    if (auth && permission) dims = { auth, permission };
  }

  const table = parseTable(body);
  const rows = table.rows.map((cells) => ({
    id: cells[0] ?? "",
    flow: cells[1] ?? "",
    situation: cells[2] ?? "",
    identity: cells[3] ?? "",
    layer: cells[4] ?? "",
    test: cells[cells.length - 1] ?? "",
    cells,
  }));

  return { status, hasSection: at >= 0, scopeRaw, scope, dimsRaw, dims, columns: table.header, rows };
}

/** The test matrix: a right and an error flow, plus guest/signed-in and allowed/denied admin flows when they apply. */
export function validateMatrix(parsed) {
  if (!parsed.hasSection) return [];
  const problems = [];

  if (parsed.scopeRaw === null) problems.push('section 6 is missing the "**Phạm vi:**" line (toàn module | một phần — <what is covered>)');
  else if (!parsed.scope) problems.push('"Phạm vi" must be "toàn module" or "một phần — <what is covered>"');

  if (parsed.dimsRaw === null) {
    problems.push('section 6 is missing the "**Chiều kiểm thử:**" line (auth = có|không (<reason>) · permission = có|không (<reason>))');
  } else if (!parsed.dims) {
    problems.push('"Chiều kiểm thử" must read "auth = có|không (<reason>) · permission = có|không (<reason>)"');
  } else {
    for (const name of ["auth", "permission"]) {
      if (!parsed.dims[name].has && !parsed.dims[name].reason) problems.push(`${name} = không needs a reason in parentheses`);
    }
    if (parsed.dims.permission.has && !parsed.dims.auth.has) problems.push("permission = có needs auth = có (a permission belongs to a signed-in identity)");
  }

  if (!parsed.columns.includes("Tình huống") || !parsed.columns.includes("Danh tính")) {
    problems.push('the flow table needs the columns "Tình huống" and "Danh tính"');
    return problems;
  }

  for (const row of parsed.rows) {
    if (!SITUATIONS.includes(row.situation)) problems.push(`flow ${row.id} has situation "${row.situation}" (expected ${SITUATIONS.join(" or ")})`);
    if (!IDENTITIES.includes(row.identity)) problems.push(`flow ${row.id} has identity "${row.identity}" (expected ${IDENTITIES.join(", ")})`);
  }

  const has = (field, value) => parsed.rows.some((r) => r[field] === value);
  for (const situation of SITUATIONS) if (!has("situation", situation)) problems.push(`the matrix needs at least one "${situation}" flow`);
  if (parsed.dims?.auth.has) {
    if (!has("identity", "khách")) problems.push('auth = có needs a "khách" flow');
    if (!SIGNED_IN.some((identity) => has("identity", identity))) problems.push(`auth = có needs a flow for a signed-in identity (${SIGNED_IN.join(", ")})`);
  }
  if (parsed.dims?.permission.has) {
    for (const identity of ["admin đủ quyền", "admin thiếu quyền"]) if (!has("identity", identity)) problems.push(`permission = có needs a "${identity}" flow`);
  }
  return problems;
}

/**
 * Structure of one tech spec (see specs/_template.md).
 * @param {string} text spec contents
 * @param {{ doc: string, fileExists: (path: string) => boolean }} ctx `doc` = module slug, e.g. `platform/auth`
 */
export function validateSpec(text, { doc, fileExists }) {
  const problems = [];
  const lines = text.split("\n");
  const at = `specs/${doc}.md`;
  const fail = (msg) => problems.push(`${at}: ${msg}`);

  if (!lines[0].startsWith("# ")) fail('first line must be the "# <module name> — Tech spec" title');

  const header = lines.slice(0, 8).join("\n");
  const meta = /> \*\*Nhóm:\*\*.*\*\*Cập nhật:\*\* (\d{4}-\d{2}-\d{2}) · \*\*Trạng thái:\*\* (\S+)/.exec(header);
  if (!meta) fail('header needs "> **Nhóm:** … · **Cập nhật:** YYYY-MM-DD · **Trạng thái:** Draft|Approved|Implemented"');
  else if (!SPEC_STATUSES.includes(meta[2])) fail(`status "${meta[2]}" must be one of ${SPEC_STATUSES.join(", ")}`);

  if (!/> \*\*Doc:\*\*/.test(header)) fail('header needs a "> **Doc:** …" line');
  else if (!fileExists(`docs/${doc}.md`)) fail(`docs/${doc}.md (its doc) does not exist`);
  if (!new RegExp(`\\*\\*Test:\\*\\*.*\`tests/${doc}/\``).test(header)) fail(`header needs "**Test:** \`tests/${doc}/\`"`);

  let from = 0;
  const headingAt = {};
  for (const heading of SPEC_HEADINGS) {
    const index = lines.findIndex((l, i) => i >= from && l.trim() === heading);
    if (index < 0) fail(`missing or out-of-order section "${heading}"`);
    else {
      headingAt[heading] = index;
      from = index + 1;
    }
  }

  const design = headingAt["## 5. Quyết định thiết kế"];
  if (design !== undefined) {
    const body = sectionBody(lines, design, 2);
    let sub = 0;
    for (const heading of DESIGN_SUBHEADINGS) {
      const index = body.findIndex((l, i) => i >= sub && l.trim() === heading);
      if (index < 0) {
        fail(`section 5 is missing or has out of order "${heading}" (write why it does not apply instead of leaving it out)`);
        continue;
      }
      sub = index + 1;
      const content = sectionBody(body, index, 3).join("\n").trim();
      if (content.length < 20) fail(`"${heading}" in section 5 is empty`);
    }
  }

  const flows = headingAt["## 6. Luồng sống còn & kế hoạch test"];
  if (flows !== undefined) {
    const rows = tableRows(sectionBody(lines, flows, 2));
    if (rows.length === 0) fail("section 6 needs a table with at least one flow");
    const seen = new Set();
    for (const cells of rows) {
      const id = cells[0];
      const testCell = cells[cells.length - 1] ?? "";
      if (seen.has(id)) fail(`section 6: flow id ${id} appears twice`);
      seen.add(id);
      const paths = testPathsIn(testCell);
      if (paths.length === 0) fail(`section 6: flow ${id} names no test file (\`tests/…\`)`);
      for (const path of paths) if (!fileExists(path)) fail(`section 6: flow ${id} points to ${path}, which does not exist`);
    }
    for (const p of validateMatrix(parseSpec(text))) fail(`section 6 matrix: ${p}`);
  }

  return problems;
}

/**
 * Critical flows table (specs/_critical-flows.md); a path that is written must exist, `—` means no test yet.
 * @param {{ modules: string[], fileExists: (path: string) => boolean }} ctx
 */
export function validateCriticalFlows(text, { modules, fileExists }) {
  const problems = [];
  const lines = text.split("\n");
  const rows = tableRows(lines);
  if (rows.length === 0) problems.push("specs/_critical-flows.md: needs a table of flows");
  const seen = new Set();
  for (const [id, , tier, module, testCell = ""] of rows) {
    if (seen.has(id)) problems.push(`specs/_critical-flows.md: flow ${id} appears twice`);
    seen.add(id);
    if (!FLOW_TIERS.includes(tier)) problems.push(`specs/_critical-flows.md: ${id} has tier "${tier}", expected ${FLOW_TIERS.join(" or ")}`);
    if (module !== "—" && !modules.includes(module)) problems.push(`specs/_critical-flows.md: ${id} names unknown module "${module}"`);
    for (const path of testPathsIn(testCell)) {
      if (!fileExists(path)) problems.push(`specs/_critical-flows.md: ${id} points to ${path}, which does not exist`);
    }
  }
  return problems;
}

/**
 * The baseline may only shrink: a covered module must leave it, an uncovered one must be in it.
 * @param {{ doc: string, hasSpec: boolean, hasTests: boolean }[]} modules
 * @param {string[]} pending
 */
export function validateBaseline(modules, pending) {
  const problems = [];
  const known = new Set(modules.map((m) => m.doc));
  for (const doc of pending) if (!known.has(doc)) problems.push(`scripts/quality-baseline.json: "${doc}" is not a module (remove it)`);
  if (new Set(pending).size !== pending.length) problems.push("scripts/quality-baseline.json: duplicate entries");

  for (const { doc, hasSpec, hasTests } of modules) {
    const listed = pending.includes(doc);
    if (hasSpec && hasTests && listed) {
      problems.push(`${doc} now has a spec and tests: remove it from scripts/quality-baseline.json (the list only shrinks)`);
    } else if (!(hasSpec && hasTests) && !listed) {
      const missing = [!hasSpec && `specs/${doc}.md`, !hasTests && `tests/${doc}/ (a *.test.ts(x) or *.e2e.ts)`].filter(Boolean).join(" and ");
      problems.push(`${doc} is missing ${missing}. New modules ship with both; the baseline cannot grow`);
    }
  }
  return problems;
}
