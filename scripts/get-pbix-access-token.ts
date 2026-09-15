import { execFile, execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const POWER_BI_RESOURCE = "https://analysis.windows.net/powerbi/api";
const ENV_KEY = "VITE_PUBLIC_PBIX_ACCESS_TOKEN";
const ENV_PATH = join(process.cwd(), ".env");
const TOKENS_URL = "http://localhost:3000/tokens";

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

function openTokensPage(url: string) {
  const [command, ...args] =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  execFile(command, args, () => {});
}

function main(): void {
  const accessToken = getAccessToken();
  // Bun charge .env dans process.env : une valeur différente vient donc du shell.
  const fromEnvFile = existsSync(ENV_PATH)
    ? new RegExp(`^${ENV_KEY}=(.*)$`, "m").exec(
        readFileSync(ENV_PATH, "utf8"),
      )?.[1]
    : undefined;
  const shellOverride =
    process.env[ENV_KEY] && process.env[ENV_KEY] !== fromEnvFile;
  upsertEnv(ENV_PATH, ENV_KEY, accessToken);
  const url = `${TOKENS_URL}?pbi-token=${encodeURIComponent(accessToken)}`;
  openTokensPage(url);
  console.log(
    `Jeton Power BI écrit dans .env (expire à ${expiresAt(accessToken)}).`,
  );
  console.log(`Si le navigateur ne s'ouvre pas, ouvre :\n${url}`);
  if (shellOverride) {
    console.warn(
      `Attention : ${ENV_KEY} est défini dans ton shell et écrase .env pour le serveur Vite. Fais "unset ${ENV_KEY}" puis relance bun run dev.`,
    );
  }
}

function expiresAt(token: string) {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString("utf8"),
  ) as { exp: number };
  return new Date(payload.exp * 1000).toLocaleTimeString("fr-FR");
}

main();
