import { createReadStream, stat } from "node:fs";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

export const RMBG2_MODEL_DEV_ROUTE = "/models/rmbg2/model.onnx";
export const RMBG2_LOCAL_MODEL_RELATIVE_PATH = "local-models/rmbg2/model.onnx";

type NextFunction = () => void;

export function rmbg2LocalModelPlugin(root = process.cwd()): Plugin {
  return {
    name: "rmbg2-local-model-dev-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(createRmbg2ModelMiddleware(root));
    },
  };
}

export function createRmbg2ModelMiddleware(root: string) {
  const modelPath = resolve(root, RMBG2_LOCAL_MODEL_RELATIVE_PATH);

  return (
    request: IncomingMessage,
    response: ServerResponse,
    next: NextFunction,
  ): void => {
    if (!request.url || !isRmbg2ModelRequest(request.url)) {
      next();
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      next();
      return;
    }

    stat(modelPath, (error, stats) => {
      if (error || !stats.isFile()) {
        respondText(
          response,
          404,
          `Modele RMBG-2.0 introuvable. Placez le fichier dans ${RMBG2_LOCAL_MODEL_RELATIVE_PATH}.`,
        );
        return;
      }

      response.statusCode = 200;
      response.setHeader("Content-Type", "application/octet-stream");
      response.setHeader("Content-Length", String(stats.size));
      response.setHeader("Cache-Control", "no-store");

      if (request.method === "HEAD") {
        response.end();
        return;
      }

      const stream = createReadStream(modelPath);
      stream.on("error", (streamError) => {
        if (!response.headersSent) {
          respondText(response, 500, `Impossible de lire le modele local. ${streamError.message}`);
          return;
        }

        response.destroy(streamError);
      });
      stream.pipe(response);
    });
  };
}

export function isRmbg2ModelRequest(requestUrl: string): boolean {
  return new URL(requestUrl, "http://localhost").pathname === RMBG2_MODEL_DEV_ROUTE;
}

function respondText(response: ServerResponse, statusCode: number, body: string): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Content-Length", String(Buffer.byteLength(body)));
  response.end(body);
}
