import { createReadStream, stat } from "node:fs";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

export const RMBG14_MODEL_DEV_DIRECTORY = "/models/rmbg1.4/";
export const RMBG14_MODEL_DEV_ROUTE = "/models/rmbg1.4/model_fp16.onnx";
export const RMBG14_LOCAL_MODEL_DIRECTORY = "local-models/rmbg1.4";
export const RMBG14_LOCAL_MODEL_RELATIVE_PATH =
  "local-models/rmbg1.4/model_fp16.onnx";

export const RMBG2_MODEL_DEV_DIRECTORY = "/models/rmbg2/";
export const RMBG2_MODEL_DEV_ROUTE = "/models/rmbg2/model_fp16.onnx";
export const RMBG2_LOCAL_MODEL_DIRECTORY = "local-models/rmbg2";
export const RMBG2_LOCAL_MODEL_RELATIVE_PATH =
  "local-models/rmbg2/model_fp16.onnx";

type RmbgModelEngineRoute = "rmbg1.4" | "rmbg2";

type RmbgModelRequest = {
  engine: RmbgModelEngineRoute;
  fileName: string;
};

type NextFunction = () => void;

const LOCAL_MODEL_DIRECTORIES: Record<RmbgModelEngineRoute, string> = {
  "rmbg1.4": RMBG14_LOCAL_MODEL_DIRECTORY,
  rmbg2: RMBG2_LOCAL_MODEL_DIRECTORY,
};

const ENGINE_LABELS: Record<RmbgModelEngineRoute, string> = {
  "rmbg1.4": "RMBG-1.4",
  rmbg2: "RMBG-2.0",
};

export function rmbgLocalModelPlugin(root = process.cwd()): Plugin {
  return {
    name: "rmbg-local-model-dev-server",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(createRmbgModelMiddleware(root));
    },
  };
}

export const rmbg2LocalModelPlugin = rmbgLocalModelPlugin;

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
          `Modele ${localModelPath.engineLabel} introuvable. Placez le fichier dans ${localModelPath.relativePath}.`,
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

export const createRmbg2ModelMiddleware = createRmbgModelMiddleware;

export function isRmbgModelRequest(requestUrl: string): boolean {
  return getRmbgModelRequest(requestUrl) !== null;
}

export const isRmbg2ModelRequest = isRmbgModelRequest;

function getLocalModelPath(
  root: string,
  requestUrl: string,
): { absolutePath: string; relativePath: string; engineLabel: string } | null {
  const modelRequest = getRmbgModelRequest(requestUrl);

  if (!modelRequest) {
    return null;
  }

  const relativePath = `${LOCAL_MODEL_DIRECTORIES[modelRequest.engine]}/${modelRequest.fileName}`;

  return {
    absolutePath: resolve(root, relativePath),
    relativePath,
    engineLabel: ENGINE_LABELS[modelRequest.engine],
  };
}

function getRmbgModelRequest(requestUrl: string): RmbgModelRequest | null {
  const pathname = new URL(requestUrl, "http://localhost").pathname;
  const match = /^\/models\/(rmbg1\.4|rmbg2)\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  const engine = match[1] as RmbgModelEngineRoute;
  const fileName = decodeURIComponent(match[2]);

  if (!/^[A-Za-z0-9_.-]+\.onnx$/.test(fileName)) {
    return null;
  }

  return { engine, fileName };
}

function respondText(response: ServerResponse, statusCode: number, body: string): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain; charset=utf-8");
  response.setHeader("Content-Length", String(Buffer.byteLength(body)));
  response.end(body);
}
