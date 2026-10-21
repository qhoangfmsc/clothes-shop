/* Comment length rule (.agent/rules/comments.md). The scanner skips strings and regex literals. */

export const MAX_COMMENT_LINES = 3;
/** JSDoc tag lines (`@param`, `@returns`, …) are type annotations in .mjs files, so they do not count. */
const TAG_LINE = /^\s*\*?\s*@\w+/;
const BANNER = /═{5,}/;
const DIRECTIVE = /^\s*(?:eslint|@ts-|conventions-ignore|quality-ignore)/;
/** A `/` after one of these starts a regex literal, not a division. */
const REGEX_PRECEDERS = new Set(["", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);

/** Every comment in `code`: where it starts, where it ends, its text, and whether it is alone on its line(s). */
function scanComments(code) {
  const comments = [];
  let line = 1;
  let lineStart = 0;
  let previous = ""; // last significant character seen in code
  const templateDepths = []; // brace depth at each open `${` inside a template literal
  let braces = 0;

  const newline = (i) => {
    line++;
    lineStart = i + 1;
  };
  const aloneOnLine = (i) => /^\s*$/.test(code.slice(lineStart, i));

  let i = 0;
  /* Reads template text from `i` up to the closing backtick, or up to the next `${` (which opens code again). */
  const readTemplate = () => {
    for (; i < code.length; i++) {
      const c = code[i];
      if (c === "\\") i++;
      else if (c === "\n") newline(i);
      else if (c === "`") return void i++;
      else if (c === "$" && code[i + 1] === "{") {
        templateDepths.push(braces);
        braces++;
        return void (i += 2);
      }
    }
  };

  while (i < code.length) {
    const c = code[i];
    if (c === "\n") {
      newline(i);
      i++;
    } else if (c === "/" && code[i + 1] === "/") {
      const start = i;
      while (i < code.length && code[i] !== "\n") i++;
      comments.push({ type: "line", start: line, end: line, text: code.slice(start + 2, i), alone: aloneOnLine(start) });
    } else if (c === "/" && code[i + 1] === "*") {
      const start = i;
      const startLine = line;
      const alone = aloneOnLine(start);
      i += 2;
      while (i < code.length && !(code[i] === "*" && code[i + 1] === "/")) {
        if (code[i] === "\n") newline(i);
        i++;
      }
      i += 2;
      comments.push({ type: "block", start: startLine, end: line, text: code.slice(start + 2, i - 2), alone });
    } else if (c === '"' || c === "'") {
      for (i++; i < code.length && code[i] !== c && code[i] !== "\n"; i++) if (code[i] === "\\") i++;
      i++;
      previous = c;
    } else if (c === "`") {
      i++;
      readTemplate();
      previous = "`";
    } else if (c === "/" && REGEX_PRECEDERS.has(previous)) {
      let inClass = false;
      for (i++; i < code.length && code[i] !== "\n"; i++) {
        if (code[i] === "\\") i++;
        else if (code[i] === "[") inClass = true;
        else if (code[i] === "]") inClass = false;
        else if (code[i] === "/" && !inClass) break;
      }
      i++;
      previous = "/";
    } else {
      if (c === "{") braces++;
      if (c === "}") {
        braces--;
        if (templateDepths.length && templateDepths[templateDepths.length - 1] === braces) {
          templateDepths.pop();
          i++;
          readTemplate();
          previous = "`";
          continue;
        }
      }
      if (!/\s/.test(c)) previous = c;
      i++;
    }
  }
  return comments;
}

/** Comments over the limit: a long block, a long run of `//` lines, or a `═` banner. */
/** @returns {{ kind: "block" | "line-run" | "banner", line: number, length: number }[]} */
export function findLongComments(code) {
  const findings = [];
  const comments = scanComments(code);

  for (const c of comments) {
    if (DIRECTIVE.test(c.text.replace(/^[\s*]+/, ""))) continue;
    if (BANNER.test(c.text)) findings.push({ kind: "banner", line: c.start, length: c.end - c.start + 1 });
    const counted = c.text.split("\n").filter((l) => !TAG_LINE.test(l)).length;
    if (c.type === "block" && counted > MAX_COMMENT_LINES) findings.push({ kind: "block", line: c.start, length: counted });
  }

  let run = [];
  const closeRun = () => {
    if (run.length > MAX_COMMENT_LINES) findings.push({ kind: "line-run", line: run[0].start, length: run.length });
    run = [];
  };
  for (const c of comments) {
    const fullLine = c.type === "line" && c.alone && !DIRECTIVE.test(c.text);
    if (fullLine && (run.length === 0 || run[run.length - 1].start === c.start - 1)) run.push(c);
    else {
      closeRun();
      if (fullLine) run.push(c);
    }
  }
  closeRun();

  return findings.sort((a, b) => a.line - b.line);
}

/** Files with long comments must be in the baseline and clean files must leave it, so it only shrinks. */
/** @param {string[]} offenders @param {string[]} baseline */
export function validateCommentBaseline(offenders, baseline) {
  const problems = [];
  for (const file of offenders) {
    if (!baseline.includes(file)) problems.push(`${file} has comments longer than ${MAX_COMMENT_LINES} lines (or a banner): shorten them (.agent/rules/comments.md)`);
  }
  for (const file of baseline) {
    if (!offenders.includes(file)) problems.push(`${file} no longer has long comments: remove it from scripts/comment-baseline.json`);
  }
  return problems;
}
