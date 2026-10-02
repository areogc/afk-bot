import { join } from "path";
import type { AppConfig } from "../config";
import type { BotState } from "../bot/state";
import { getLogs } from "../utils/logger";
import { addLog } from "../utils/logger";

const DASHBOARD_DIR = join(import.meta.dir, "..", "..", "dashboard", "dist");

async function serveStatic(pathname: string): Promise<Response> {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const filePath = join(DASHBOARD_DIR, relative);
  const file = Bun.file(filePath);

  if (await file.exists()) {
    return new Response(file);
  }

  const fallback = Bun.file(join(DASHBOARD_DIR, "index.html"));
  if (await fallback.exists()) {
    return new Response(fallback);
  }

  return new Response("dashboard not built, run bun run dashboard:build", {
    status: 404,
  });
}

export function startServer(config: AppConfig, state: BotState): void {
  Bun.serve({
    port: config.http.port,
    async fetch(request) {
      const url = new URL(request.url);

      if (url.pathname === "/ping") {
        return new Response("ok");
      }

      if (url.pathname === "/api/status") {
        return Response.json(state.get());
      }

      if (url.pathname === "/api/logs") {
        return Response.json(getLogs());
      }

      return serveStatic(url.pathname);
    },
  });

  addLog(`http server listening on port ${config.http.port}`);
}
