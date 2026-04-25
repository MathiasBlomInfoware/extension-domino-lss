// @ts-check
const fs = require("node:fs");
const path = require("node:path");
const https = require("node:https");

const ROOT = path.join(__dirname, "..");
const CFG_PATH = path.join(__dirname, "hcl-verify-config.json");
const HCL_DOCS_PATH = path.join(ROOT, "hcl-docs.js");
const MEMBERS_PATH = path.join(ROOT, "data", "notes-members.json");
const REPORT_DIR = path.join(__dirname, "reports");
const REPORT_PATH = path.join(REPORT_DIR, "hcl-verify-report.json");

const MAX_CONCURRENCY = 8;
const RETRIES = 2;
const REQUEST_TIMEOUT_MS = 20000;

/**
 * @param {string} u
 * @returns {Promise<{ status: number; body: string; url: string }>}
 */
function fetchText(u) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      u,
      {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          "User-Agent": "extension-domino-lss-hcl-verifier/1.0",
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location) {
          const next = new URL(location, u).toString();
          res.resume();
          resolve(fetchText(next));
          return;
        }
        const chunks = [];
        res.setEncoding("utf8");
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status,
            body: chunks.join(""),
            url: u,
          });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy(new Error(`Timeout after ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
  });
}

/**
 * @template T,U
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, idx: number) => Promise<U>} worker
 * @returns {Promise<U[]>}
 */
async function mapLimit(items, concurrency, worker) {
  /** @type {U[]} */
  const out = new Array(items.length);
  let next = 0;
  const runners = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = next++;
      if (idx >= items.length) return;
      out[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return out;
}

/**
 * @param {string} html
 */
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, "\"")
    .replace(/\s+/g, " ");
}

/**
 * @param {string} source
 */
function extractTopicFilesFromSource(source) {
  const hits = source.match(/[A-Za-z0-9_./-]+\.html/g) || [];
  const filtered = hits.filter((h) => !h.startsWith("http://") && !h.startsWith("https://"));
  return [...new Set(filtered)];
}

/**
 * @param {string} className
 */
function classTopicFile(className) {
  const tail = className.startsWith("Notes") ? className.slice(5) : className;
  const upper = tail.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return `H_NOTES${upper}_CLASS.html`;
}

/**
 * @param {string} text
 * @param {string} symbol
 */
function containsSymbol(text, symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

async function main() {
  const cfg = JSON.parse(fs.readFileSync(CFG_PATH, "utf8"));
  const members = JSON.parse(fs.readFileSync(MEMBERS_PATH, "utf8"));
  const hclDocsSource = fs.readFileSync(HCL_DOCS_PATH, "utf8");
  const classNames = Object.keys(members).sort();
  const classIndexFile = String(cfg.classIndexFile || "H_4_LOTUSSCRIPT_NOTES_CLASSES_REFERENCE.html");
  const strictMembers = !!cfg.strictMembers;
  const classIndexExceptions = new Set(
    Array.isArray(cfg.classIndexExceptions) ? cfg.classIndexExceptions.map(String) : []
  );
  const classMemberExceptions = cfg.classMemberExceptions || {};
  const topicFilesFromSource = extractTopicFilesFromSource(hclDocsSource);
  const classTopicFiles = classNames.map(classTopicFile);
  const topicFiles = [...new Set([...topicFilesFromSource, ...classTopicFiles, classIndexFile])];
  const baseUrl = String(cfg.baseUrl);
  const startedAt = new Date().toISOString();

  process.stdout.write(`Verifying ${topicFiles.length} HCL topic links...\n`);
  const topicResults = await mapLimit(topicFiles, MAX_CONCURRENCY, async (file) => {
    const url = new URL(file, baseUrl).toString();
    let lastError = "";
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        const res = await fetchText(url);
        return {
          file,
          url,
          status: res.status,
          ok: res.status >= 200 && res.status < 300,
          error: "",
        };
      } catch (err) {
        lastError = String(err && err.message ? err.message : err);
      }
    }
    return { file, url, status: 0, ok: false, error: lastError };
  });
  const brokenTopics = topicResults.filter((r) => !r.ok);

  process.stdout.write(`Checking class index ${classIndexFile}...\n`);
  const classIndexUrl = new URL(classIndexFile, baseUrl).toString();
  const classIndexRes = await fetchText(classIndexUrl);
  const classIndexText = htmlToText(classIndexRes.body);
  const classesInIndex = [...new Set(classIndexText.match(/\bNotes[A-Za-z][A-Za-z0-9_]*\b/g) || [])].sort();
  const missingClassesInIndex = classNames.filter((c) => !classesInIndex.includes(c) && !classIndexExceptions.has(c));

  process.stdout.write(`Checking member coverage for ${classNames.length} classes...\n`);
  const classChecks = await mapLimit(classNames, MAX_CONCURRENCY, async (className) => {
    const file = classTopicFile(className);
    const url = new URL(file, baseUrl).toString();
    const res = await fetchText(url);
    const text = htmlToText(res.body);
    const localMembers = Array.isArray(members[className]) ? members[className] : [];
    const exceptions = new Set(Array.isArray(classMemberExceptions[className]) ? classMemberExceptions[className] : []);
    /** @type {string[]} */
    const missing = [];
    for (const item of localMembers) {
      const member = String(item && item.name ? item.name : "").trim();
      if (!member || exceptions.has(member)) continue;
      if (!containsSymbol(text, member)) {
        missing.push(member);
      }
    }
    return {
      className,
      file,
      url,
      status: res.status,
      checkedMembers: localMembers.length,
      missingMembers: missing.sort(),
      ok: missing.length === 0 && res.status >= 200 && res.status < 300,
    };
  });
  const classesWithMissingMembers = classChecks
    .filter((c) => c.missingMembers.length > 0)
    .map((c) => ({ className: c.className, missingMembers: c.missingMembers }));

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    baseUrl,
    totals: {
      topicFiles: topicFiles.length,
      brokenTopics: brokenTopics.length,
      localClasses: classNames.length,
      classesInIndex: classesInIndex.length,
      missingClassesInIndex: missingClassesInIndex.length,
      classesWithMissingMembers: classesWithMissingMembers.length,
    },
  };

  const report = {
    summary,
    brokenTopics,
    missingClassesInIndex,
    classesWithMissingMembers,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");

  process.stdout.write(`Report written: ${path.relative(ROOT, REPORT_PATH)}\n`);
  process.stdout.write(
    `Broken topics: ${brokenTopics.length}, missing classes in index: ${missingClassesInIndex.length}, classes with missing members: ${classesWithMissingMembers.length} (strictMembers=${strictMembers})\n`
  );

  if (brokenTopics.length || missingClassesInIndex.length || (strictMembers && classesWithMissingMembers.length)) {
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(String(err && err.stack ? err.stack : err) + "\n");
  process.exit(1);
});
