import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));
const root = resolve(args.root || "docs");
const port = Number(args.port || process.env.PORT || 4173);
const host = args.host || process.env.HOST || "127.0.0.1";
const maxPortAttempts = Number(args.maxPortAttempts || 20);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    let filePath = resolve(join(root, safePath));

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    if (!existsSync(filePath) || (await stat(filePath)).isDirectory()) {
      filePath = join(filePath, "index.html");
    }

    if (!existsSync(filePath)) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store"
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500);
    response.end(String(error));
  }
});

listenWithFallback(port, 0);

function listenWithFallback(nextPort, attempt) {
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attempt < maxPortAttempts) {
      const fallbackPort = nextPort + 1;
      console.log(`Port ${nextPort} is busy, trying http://${host}:${fallbackPort}`);
      listenWithFallback(fallbackPort, attempt + 1);
      return;
    }

    console.error(error);
    process.exitCode = 1;
  });

  server.listen(nextPort, host, () => {
    console.log(`Ranking page running at http://${host}:${nextPort}`);
  });
}

function contentType(filePath) {
  const ext = extname(filePath);
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml"
  }[ext] || "application/octet-stream";
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      result[arg.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return result;
}
