import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/* A tiny throw-away project (one module "g/m": code, doc, spec, test) for running the real gate scripts end to end.
   `GATE_ROOT` / `GATE_MODULES` point the scripts at it; nothing here touches the real repository. */

const REPO = process.cwd();
const TODAY = new Date().toLocaleDateString("sv-SE");

export const SPEC = (date = "2020-01-01") => `# M — Tech spec

> **Nhóm:** G · **Cập nhật:** ${date} · **Trạng thái:** Implemented
> **Doc:** [g/m](../../docs/g/m.md) · **Test:** \`tests/g/m/\`

## 1. Bối cảnh & mục tiêu

Vấn đề.

## 2. Phạm vi

Làm gì.

## 3. Hợp đồng

Hành vi.

## 4. Thiết kế

Luồng.

## 5. Quyết định thiết kế

### Design pattern

Hàm thuần vì dễ kiểm tra hơn.

### Kiến trúc

Nằm ở tầng lib, không phụ thuộc ai.

### SOLID

Mỗi hàm một trách nhiệm rõ ràng.

### Conventions

Tiếng Anh, không có chữ giao diện.

## 6. Luồng sống còn & kế hoạch test

**Phạm vi:** toàn module
**Chiều kiểm thử:** auth = không (hàm thuần) · permission = không (không có quyền)

| ID | Luồng | Tình huống | Danh tính | Tầng | Test |
|---|---|---|---|---|---|
| M-1 | Làm đúng | đúng | — | unit | \`tests/g/m/m.test.ts\` |
| M-2 | Làm sai | lỗi | — | unit | \`tests/g/m/m.test.ts\` |

## 7. Rủi ro & triển khai

Không có.

## 8. Lịch sử thay đổi

- 2020-01-01 · Viết spec.
`;

export const DOC = (date = "2020-01-01") => `# M

> **Nhóm:** G · **Cập nhật:** ${date}
> **Code:** \`src/m.ts\`

## 1. Tóm tắt module

Một hàm.

## 2. Phục vụ gì / việc cần làm

Tính toán.

## 3. Submodule & chức năng hiện có

| Phần | Nội dung |
|---|---|
| Hàm | Tính |

## 4. Chi tiết

Chi tiết ở đây.
`;

const MODULES_FILE = `export const MODULES = [{ doc: "g/m", paths: ["src/m.ts"] }];
export const IGNORED = [/^src\\/messages\\//];
export const CODE_ROOTS = ["src"];
export const CODE_FILES = [];
export const CODE_EXT = /\\.(ts|tsx|mjs|json)$/;
`;

const CRITICAL = `# Luồng sống còn

| ID | Luồng | Tier | Module | Test |
|---|---|---|---|---|
| F-1 | Làm đúng | P0 | g/m | \`tests/g/m/m.test.ts\` |
`;

export interface RunResult {
  status: number | null;
  out: string;
}

export class Project {
  readonly root = mkdtempSync(join(tmpdir(), "gate-"));

  constructor() {
    this.setUp();
  }

  private setUp() {
    this.write("scripts/modules.mjs", MODULES_FILE);
    this.write("scripts/quality-baseline.json", JSON.stringify({ pending: [] }));
    this.write("scripts/comment-baseline.json", JSON.stringify({ files: [] }));
    this.write("scripts/test-batches.json", JSON.stringify({ done: ["g/m"], batches: [] }));
    this.write("src/m.ts", "export const m = 1;\n");
    this.write("docs/README.md", "# Docs\n\n| Module | File |\n|---|---|\n| M | [g/m](g/m.md) |\n");
    this.write("docs/g/m.md", DOC());
    this.write("specs/README.md", "# Specs\n");
    this.write("specs/_critical-flows.md", CRITICAL);
    this.write("specs/g/m.md", SPEC());
    this.write("tests/README.md", "# Tests\n");
    this.write("tests/g/m/m.test.ts", "export {};\n");
    // The real vitest, for the mutant runner
    symlinkSync(join(REPO, "node_modules"), join(this.root, "node_modules"));
    this.write("package.json", JSON.stringify({ name: "gate-fixture", private: true, type: "module" }));
    this.write("vitest.config.mts", 'import { defineConfig } from "vitest/config";\nexport default defineConfig({ test: { include: ["tests/**/*.test.ts"] } });\n');
  }

  write(rel: string, content: string) {
    const path = join(this.root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  }

  read(rel: string) {
    return readFileSync(join(this.root, rel), "utf8");
  }

  remove(rel: string) {
    rmSync(join(this.root, rel), { recursive: true, force: true });
  }

  /** Replaces text in a file of the project. */
  edit(rel: string, from: string, to: string) {
    const text = this.read(rel);
    if (!text.includes(from)) throw new Error(`${rel} has no ${JSON.stringify(from)}`);
    this.write(rel, text.replace(from, to));
  }

  /** Runs one of the repository's scripts against this project. */
  run(script: string, args: string[] = [], env: Record<string, string> = {}): RunResult {
    const result = spawnSync(process.execPath, [join(REPO, "scripts", script), ...args], {
      cwd: this.root,
      encoding: "utf8",
      env: { ...process.env, GATE_ROOT: this.root, GATE_MODULES: join(this.root, "scripts/modules.mjs"), ...env },
    });
    return { status: result.status, out: `${result.stdout}${result.stderr}` };
  }

  git(...args: string[]) {
    return execFileSync("git", args, { cwd: this.root, encoding: "utf8" });
  }

  /** Turns the project into a git repository and commits everything as the starting point. */
  commitAll(message = "base") {
    try {
      this.git("rev-parse", "--git-dir");
    } catch {
      this.git("init", "-q");
      this.git("config", "user.email", "t@example.com");
      this.git("config", "user.name", "t");
      this.write(".gitignore", "node_modules\n");
    }
    this.git("add", "-A");
    this.git("commit", "-q", "-m", message);
  }

  dispose() {
    rmSync(this.root, { recursive: true, force: true });
  }
}

export { TODAY };
