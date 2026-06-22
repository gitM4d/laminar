import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const FRONTEND_SRC_DIR = join(process.cwd(), "frontend", "src");

const ALLOWED_LAMINAR_IMPORT = "@laminar/frontend-safe";

const FORBIDDEN_LAMINAR_PREFIXES = [
  "@laminar/core",
  "@laminar/api",
  "@laminar/execution-adapters",
  "@laminar/tools",
  "@laminar/adapters",
  "@laminar/demo",
  "@laminar/providers",
] as const;

const FORBIDDEN_NODE_MODULES = [
  "fs",
  "path",
  "dotenv",
  "child_process",
  "node:fs",
  "node:path",
  "node:child_process",
  "node:crypto",
] as const;

export type FrontendImportViolation = {
  file: string;
  importPath: string;
  reason: string;
};

function collectSourceFiles(directory: string): string[] {
  const entries = readdirSync(directory);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    const extension = extname(fullPath);
    if (extension === ".ts" || extension === ".tsx") {
      files.push(fullPath);
    }
  }

  return files;
}

export function extractImportPaths(source: string): string[] {
  const imports = new Set<string>();
  const patterns = [
    /import\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?["']([^"']+)["']/g,
    /export\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const importPath = match[1];
      if (importPath !== undefined) {
        imports.add(importPath);
      }
    }
  }

  return [...imports];
}

export function validateFrontendImportPath(
  importPath: string,
): FrontendImportViolation | null {
  if (FORBIDDEN_NODE_MODULES.includes(importPath as (typeof FORBIDDEN_NODE_MODULES)[number])) {
    return {
      file: "",
      importPath,
      reason: `Forbidden Node/server module "${importPath}".`,
    };
  }

  if (!importPath.startsWith("@laminar")) {
    return null;
  }

  if (
    importPath === ALLOWED_LAMINAR_IMPORT ||
    importPath.startsWith(`${ALLOWED_LAMINAR_IMPORT}/`)
  ) {
    return null;
  }

  if (importPath === "@laminar") {
    return {
      file: "",
      importPath,
      reason: "Broad @laminar alias imports are forbidden in frontend code.",
    };
  }

  for (const prefix of FORBIDDEN_LAMINAR_PREFIXES) {
    if (importPath.startsWith(prefix)) {
      return {
        file: "",
        importPath,
        reason: `Forbidden Laminar import prefix "${prefix}".`,
      };
    }
  }

  return {
    file: "",
    importPath,
    reason: `Only "${ALLOWED_LAMINAR_IMPORT}" is allowed for @laminar imports.`,
  };
}

export function scanFrontendImportBoundary(
  frontendSrcDir = FRONTEND_SRC_DIR,
): FrontendImportViolation[] {
  const violations: FrontendImportViolation[] = [];

  for (const filePath of collectSourceFiles(frontendSrcDir)) {
    const source = readFileSync(filePath, "utf8");
    const relativeFile = filePath.slice(process.cwd().length + 1);

    for (const importPath of extractImportPaths(source)) {
      const violation = validateFrontendImportPath(importPath);
      if (violation !== null) {
        violations.push({
          ...violation,
          file: relativeFile,
        });
      }
    }
  }

  return violations;
}
