// @ts-check
const fs = require("node:fs");
const path = require("node:path");
const { stripCommentsAndStrings, forEachExecutableLine, findIdentifierOccurrences } = require("../text-scan.js");

/**
 * @param {string} name
 * @param {boolean} condition
 */
function assert(name, condition) {
  if (!condition) {
    throw new Error(`FAIL: ${name}`);
  }
  process.stdout.write(`PASS: ${name}\n`);
}

/**
 * Minimal TextDocument-like shim for scanner tests.
 * @param {string} text
 */
function makeDoc(text) {
  const lines = text.split(/\r?\n/);
  return {
    lineCount: lines.length,
    lineAt(line) {
      return { text: lines[line] ?? "" };
    },
  };
}

function run() {
  const fixturePath = path.join(__dirname, "fixtures", "scanner-sample.lss");
  const fixture = fs.readFileSync(fixturePath, "utf8");
  const doc = makeDoc(fixture);

  const cleaned = stripCommentsAndStrings(`value = "alpha" ' beta`);
  assert("strip keeps code chars", cleaned.includes("value = "));
  assert("strip removes string/comment payload", !cleaned.includes("alpha") && !cleaned.includes("beta"));

  const alphaRefs = findIdentifierOccurrences(doc, "alpha");
  assert("alpha occurrences skip comments/strings/%REM", alphaRefs.length === 4);

  let executableLines = 0;
  forEachExecutableLine(doc, () => {
    executableLines++;
  });
  assert("forEachExecutableLine skips %REM body", executableLines > 0 && executableLines < doc.lineCount);

  process.stdout.write("\nFixture scanner tests passed.\n");
}

try {
  run();
} catch (err) {
  process.stderr.write(String(err && err.stack ? err.stack : err) + "\n");
  process.exit(1);
}
