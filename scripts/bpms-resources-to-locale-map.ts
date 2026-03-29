/**
 * Converts bpms-resources.json (array of rows) into:
 * { [CultureName]: { [`${ResourceType}.${ResourceKey}`]: ResourceValue } }
 *
 * Duplicate keys per culture: last row wins (same as Object assign order).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface BpmsResourceRow {
  ResourceType: string;
  CultureName: string;
  ResourceKey: string;
  ResourceValue: string;
  ResourceNo?: number;
  InitBy?: string;
  InitDate?: string;
  ChangedBy?: string | null;
  ChangedDate?: string | null;
}

export type LocaleResourceMap = Record<string, Record<string, string>>;

function makeCompositeKey(resourceType: string, resourceKey: string): string {
  return `${resourceType}.${resourceKey}`;
}

export function bpmsResourcesArrayToLocaleMap(
  rows: BpmsResourceRow[],
): LocaleResourceMap {
  const out: LocaleResourceMap = {};

  for (const row of rows) {
    const culture = row.CultureName;
    const key = makeCompositeKey(row.ResourceType, row.ResourceKey);
    const value = row.ResourceValue ?? "";

    if (!out[culture]) {
      out[culture] = {};
    }
    out[culture][key] = value;
  }

  return out;
}

function parseArgs(argv: string[]): {
  input: string;
  output: string;
  pretty: boolean;
} {
  let input = "bpms-resources/bpms-resources.json";
  let output = "bpms-resources/bpms-resources.by-culture.json";
  let pretty = true;

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" || a === "-i") {
      input = argv[++i] ?? input;
    } else if (a === "--output" || a === "-o") {
      output = argv[++i] ?? output;
    } else if (a === "--minify" || a === "-m") {
      pretty = false;
    } else if (a === "--help" || a === "-h") {
      console.log(`Usage: tsx scripts/bpms-resources-to-locale-map.ts [options]

Options:
  -i, --input <path>   Source JSON (default: bpms-resources/bpms-resources.json)
  -o, --output <path>  Output JSON (default: bpms-resources/bpms-resources.by-culture.json)
  -m, --minify         Single-line output (no pretty print)
  -h, --help           Show this help
`);
      process.exit(0);
    }
  }

  return {
    input: resolve(process.cwd(), input),
    output: resolve(process.cwd(), output),
    pretty,
  };
}

function main(): void {
  const { input, output, pretty } = parseArgs(process.argv);

  const raw = readFileSync(input, "utf8");
  const rows = JSON.parse(raw) as BpmsResourceRow[];

  if (!Array.isArray(rows)) {
    throw new Error("Expected top-level JSON array");
  }

  const map = bpmsResourcesArrayToLocaleMap(rows);
  const json = pretty ? JSON.stringify(map, null, 2) : JSON.stringify(map);

  writeFileSync(output, json, "utf8");

  const cultures = Object.keys(map).length;
  const totalKeys = Object.values(map).reduce(
    (n, o) => n + Object.keys(o).length,
    0,
  );
  console.log(`Wrote ${output}`);
  console.log(
    `  Cultures: ${cultures}, total ResourceType.ResourceKey entries: ${totalKeys}`,
  );
}

main();
