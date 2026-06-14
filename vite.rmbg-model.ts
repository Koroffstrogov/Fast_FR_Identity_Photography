import { createReadStream, stat } from "node:fs";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

export const RMBG_MODEL_DEV_DIRECTORY = "/models/rmbg1.4/";
export const RMBG_MODEL_DEV_ROUTE = "/models/rmbg1.4/model_fp16.onnx";
export const RMBG_LOCAL_MODEL_DIRECTORY = "local-models/rmbg1.4";
export const RMBG_LOCAL_MODEL_RELATIVE_PATH =
  "local-models/rmbg1.4/model_fp16.onnx";

type RmbgModelRequest = {
  fileName: string;
};

type NextFunction = () => void;

export function rmbgLocalModelPlugin(root = process.cwd()): Plugin {
  return {
    name: "rmbg-local-model-dev-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(createRmbgModelMiddleware(root));
    },
  };
}

export function createRmbgModelMiddleware(root: string) {
  return (
    request: IncomingMessage,
    response: ServerResponse,
    next: NextFunction,
  ): void => {
    if (!request.url || !isRmbgModelRequest(request.url)) {
      next();
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      next();
      return;
    }

    const localModelPath = getLocalModelPath(root, request.url);

    if (!localModelPath) {
      next();
      return;
    }

    stat(localModelPath.absolutePath, (error, stats) => {
      if (error || !stats.isFile()) {
        respondText(
          response,
          404,
          `Modele RMBG-1.4 introuvable. Placez le fichier dans ${localModelPath.relativePath}.`,
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

      const stream = createReadStream(localModelPath.absolutePath);
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

export function isRmbgModelRequest(requestUrl: string): boolean {
  return getRmbgModelRequest(requestUrl) !== null;
}

function getLocalModelPath(
  root: string,
  requestUrl: string,
): { absolutePath: string; relativePath: string } | null {
  const modelRequest = getRmbgModelRequest(requestUrl);

  if (!modelRequest) {
    return null;
  }

  const relativePath = `${RMBG_LOCAL_MODEL_DIRECTORY}/${modelRequest.fileName}`;

  return {
    absolutePath: resolve(root, relativePath),
    relativePath,
  };
}

function getRmbgModelRequest(requestUrl: string): RmbgModelRequest | null {
  const pathname = new URL(requestUrl, "http://localhost").pathname;
  const match = /^\/models\/rmbg1\.4\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  const fileName = decodeURIComponent(match[1]);

  if (!/^[A-Za-z0-9_.-]+\.onnx$/.test(fileName)) {
    return null;
  }

  return { fileName };
}

function respondText(response: ServerResponse, statusCode: number, body: string): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Content-Length", String(Buffer.byteLength(body)));
  response.end(body);
}
