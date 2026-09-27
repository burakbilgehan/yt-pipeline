/**
 * User feedback tracker for a layout-2 project: feedback/feedback.json.
 * Every item is tied to one block id (or "global"), so a fix has a clear scope.
 *
 * Usage:
 *   npm run feedback -- <slug> add <block-id|global> "<text>"
 *   npm run feedback -- <slug> list [--all]          (default: open items only)
 *   npm run feedback -- <slug> fixed <n> ["<note>"]
 *   npm run feedback -- <slug> wontfix <n> "<reason>"
 *   npm run feedback -- <slug> reopen <n> "<reason>"
 */

import fs from "node:fs";
import path from "node:path";
import { assertLayout2, orderedBlocks, paths, writeJson } from "../pipeline/v2.js";

type Status = "open" | "fixed" | "wontfix";
interface Item {
  n: number;
  block: string;
  text: string;
  status: Status;
  createdAt: string;
  history: Array<{ at: string; status: Status; note?: string }>;
}

function main() {
  const [slug, cmd, ...rest] = process.argv.slice(2);
  if (!slug || !cmd) {
    console.error('Usage: npm run feedback -- <slug> add|list|fixed|wontfix|reopen ...');
    process.exit(1);
  }
  assertLayout2(slug);
  const file = path.join(paths(slug).root, "feedback", "feedback.json");
  const items: Item[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")).items : [];
  const now = new Date().toISOString();
  const find = (n: string) => {
    const item = items.find((i) => i.n === Number(n));
    if (!item) throw new Error(`No feedback item #${n}`);
    return item;
  };
  const setStatus = (item: Item, status: Status, note?: string) => {
    item.status = status;
    item.history.push({ at: now, status, ...(note ? { note } : {}) });
  };

  switch (cmd) {
    case "add": {
      const [block, text] = rest;
      const blocks = orderedBlocks(slug).map((b) => b.id);
      if (!text || (block !== "global" && !blocks.includes(block))) {
        throw new Error(`add needs a known block id (or "global") and text. Blocks: ${blocks.join(", ")}`);
      }
      const n = items.reduce((m, i) => Math.max(m, i.n), 0) + 1;
      items.push({ n, block, text, status: "open", createdAt: now, history: [{ at: now, status: "open" }] });
      console.log(`#${n} [${block}] ${text}`);
      break;
    }
    case "list": {
      const shown = rest.includes("--all") ? items : items.filter((i) => i.status === "open");
      for (const i of shown) console.log(`#${i.n} ${i.status.padEnd(7)} [${i.block}] ${i.text}`);
      console.log(`${items.filter((i) => i.status === "open").length} open / ${items.length} total`);
      return;
    }
    case "fixed":
      setStatus(find(rest[0]), "fixed", rest[1]);
      break;
    case "wontfix":
    case "reopen":
      if (!rest[1]) throw new Error(`${cmd} needs a reason`);
      setStatus(find(rest[0]), cmd === "wontfix" ? "wontfix" : "open", rest[1]);
      break;
    default:
      throw new Error(`Unknown command "${cmd}"`);
  }
  writeJson(file, { items });
}

try {
  main();
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
