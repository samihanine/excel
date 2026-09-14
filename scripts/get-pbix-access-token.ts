import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const POWER_BI_RESOURCE = "https://analysis.windows.net/powerbi/api";
const ENV_KEY = "VITE_PUBLIC_PBIX_ACCESS_TOKEN";
const ENV_PATH = join(process.cwd(), ".env");

function getAccessToken(): string {
  try {
    return execFileSync(
      "az",
      [
        "account",
        "get-access-token",
        "--resource",
        POWER_BI_RESOURCE,
        "--query",
        "accessToken",
        "--output",
        "tsv",
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim();
  } catch {
    throw new Error(
      [
        "Impossible d'obtenir un jeton avec Azure CLI.",
        "Exécute d'abord :",
        "az login --allow-no-subscriptions",
      ].join("\n"),
    );
  }
}

function upsertEnv(path: string, key: string, value: string) {
  const line = `${key}=${value}`;
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current.replace(/\s*$/, "")}${current.trim() ? "\n" : ""}${line}\n`;
  writeFileSync(path, next.endsWith("\n") ? next : `${next}\n`, {
    encoding: "utf8",
  });
}

function main(): void {
  const accessToken = getAccessToken();
  upsertEnv(ENV_PATH, ENV_KEY, accessToken);
}

main();
