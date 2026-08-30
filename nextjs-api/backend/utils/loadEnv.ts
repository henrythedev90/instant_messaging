import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const shellEnvKeys = new Set(Object.keys(process.env));

function loadEnvFile(filename: string, overrideLoadedFiles: boolean) {
  const filePath = resolve(process.cwd(), filename);
  if (!existsSync(filePath)) {
    return;
  }

  for (const rawLine of readFileSync(filePath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (shellEnvKeys.has(key)) {
      continue;
    }

    if (overrideLoadedFiles || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// Match Next.js precedence: .env first, then .env.local overrides.
loadEnvFile(".env", false);
loadEnvFile(".env.local", true);
