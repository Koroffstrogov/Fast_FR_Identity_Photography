import { createServer } from "node:http";
import type { Server } from "node:http";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  RMBG_LOCAL_MODEL_RELATIVE_PATH,
  RMBG_MODEL_DEV_ROUTE,
  createRmbgModelMiddleware,
  isRmbgModelRequest,
} from "../vite.rmbg-model";

const tempRoots: string[] = [];
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(closeServer));
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("RMBG local model Vite middleware", () => {
  it("matches only the RMBG-1.4 runtime model route", () => {
    expect(isRmbgModelRequest("/models/rmbg1.4/model.onnx")).toBe(true);
    expect(isRmbgModelRequest("/models/rmbg1.4/model_fp16.onnx")).toBe(true);
    expect(isRmbgModelRequest("/models/rmbg1.4/model_quantized.onnx")).toBe(true);
    expect(isRmbgModelRequest("/models/rmbg1.4/../model_fp16.onnx")).toBe(false);
    expect(isRmbgModelRequest("/models/rmbg1.4/not-a-model.txt")).toBe(false);
    expect(isRmbgModelRequest(`/models/${"rmbg" + "2"}/model_fp16.onnx`)).toBe(
      false,
    );
  });

  it("serves RMBG-1.4 local models for GET and HEAD", async () => {
    const root = await createTempRoot();
    const modelPath = join(root, RMBG_LOCAL_MODEL_RELATIVE_PATH);
    await mkdir(dirname(modelPath), { recursive: true });
    await writeFile(modelPath, Buffer.from([1, 2, 3, 4]));

    const origin = await startServer(root);

    const getResponse = await fetch(`${origin}${RMBG_MODEL_DEV_ROUTE}?cacheBust=1`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.headers.get("content-type")).toBe("application/octet-stream");
    expect(getResponse.headers.get("content-length")).toBe("4");
    expect([...new Uint8Array(await getResponse.arrayBuffer())]).toEqual([1, 2, 3, 4]);

    const headResponse = await fetch(`${origin}${RMBG_MODEL_DEV_ROUTE}`, {
      method: "HEAD",
    });
    expect(headResponse.status).toBe(200);
    expect(headResponse.headers.get("content-length")).toBe("4");
    expect((await headResponse.arrayBuffer()).byteLength).toBe(0);
  });

  it("returns a clear 404 when the local model is missing", async () => {
    const root = await createTempRoot();
    const origin = await startServer(root);

    const response = await fetch(`${origin}${RMBG_MODEL_DEV_ROUTE}`);
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(body).toContain(RMBG_LOCAL_MODEL_RELATIVE_PATH);
  });
});

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "rmbg-model-"));
  tempRoots.push(root);
  return root;
}

async function startServer(root: string): Promise<string> {
  const middleware = createRmbgModelMiddleware(root);
  const server = createServer((request, response) => {
    middleware(request, response, () => {
      response.statusCode = 404;
      response.end("next");
    });
  });
  servers.push(server);

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", resolve);
    server.on("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to allocate test server port.");
  }

  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
