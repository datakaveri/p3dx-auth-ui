// One-off/repeatable generator: flattens the vendor per-provider "sizes by
// class" datasets in `../Cluster/VM Data/` into src/data/instanceSizeData.js
// — the normalized, class -> flat-sorted-size-list shape the Infra Policy
// form's cascading Class/Size dropdowns actually query.
//
// Run manually (`node scripts/build-instance-size-data.mjs` from
// p3dx-auth-ui/) whenever the vendor JSONs are refreshed. Not wired into
// `npm run build` — the output is a committed, reviewable source file.
//
// Source datasets keep a lot of detail (series grouping, network/GPU specs,
// per-family descriptions, storage fields that are inconsistent or entirely
// absent depending on provider) that this form doesn't need. This script
// keeps only what the class/size pickers and the SGX/confidential-computing
// hint use: name, vcpus, ram_gib, SGX_Enabled, confidential_computing.
// Storage is intentionally dropped — it stays a manual field in the form.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vmDataDir = path.resolve(__dirname, "..", "..", "Cluster", "VM Data");

const SOURCES = {
  aws: "aws-instance-sizes-by-class.json",
  azure: "azure-vm-sizes-by-class.json",
  gcp: "gcp-instance-sizes-by-class.json",
};

function normalizeSize(raw) {
  return {
    name: raw.name,
    vcpus: raw.vcpus,
    ramGib: raw.ram_gib,
    sgxEnabled: Boolean(raw.SGX_Enabled),
    confidentialComputing: raw.confidential_computing ?? null,
  };
}

// Flattens every series under a class into one array. Sizes are compared by
// vcpus first (smallest/cheapest-looking first, matching how cloud consoles
// order size pickers), then ramGib, then name, so ties are still stable and
// deterministic between runs.
function flattenClass(classData) {
  const sizes = [];
  for (const series of Object.values(classData.series || {})) {
    for (const raw of series.sizes || []) {
      sizes.push(normalizeSize(raw));
    }
  }
  sizes.sort((a, b) => a.vcpus - b.vcpus || a.ramGib - b.ramGib || a.name.localeCompare(b.name));
  return sizes;
}

async function loadProvider(fileName) {
  const filePath = path.join(vmDataDir, fileName);
  const raw = JSON.parse(await readFile(filePath, "utf8"));
  const classes = {};
  for (const [className, classData] of Object.entries(raw.classes || {})) {
    classes[className] = flattenClass(classData);
  }
  return classes;
}

async function main() {
  const INSTANCE_SIZES = {};
  for (const [provider, fileName] of Object.entries(SOURCES)) {
    INSTANCE_SIZES[provider] = await loadProvider(fileName);
  }

  const outPath = path.resolve(__dirname, "..", "src", "data", "instanceSizeData.js");
  const banner =
    "// GENERATED FILE — do not hand-edit. Produced by scripts/build-instance-size-data.mjs\n" +
    "// from the vendor datasets in `Cluster/VM Data/` (AWS/Azure/GCP instance sizes by\n" +
    "// class). Re-run that script after updating the vendor JSONs.\n\n";

  const helpers =
    "export function getClassesForProvider(provider) {\n" +
    "  return Object.keys(INSTANCE_SIZES[provider] || {});\n" +
    "}\n\n" +
    "export function getSizesForClass(provider, className) {\n" +
    "  return INSTANCE_SIZES[provider]?.[className] || [];\n" +
    "}\n\n" +
    "export function getSizeByName(provider, className, sizeName) {\n" +
    "  return getSizesForClass(provider, className).find(s => s.name === sizeName) || null;\n" +
    "}\n";

  const content =
    banner +
    `export const INSTANCE_SIZES = ${JSON.stringify(INSTANCE_SIZES, null, 2)};\n\n` +
    helpers;

  await writeFile(outPath, content, "utf8");
  console.log(`Wrote ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
