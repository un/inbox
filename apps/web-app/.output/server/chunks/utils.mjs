import { existsSync, promises } from 'node:fs';
import { Buffer } from 'node:buffer';
import { getRequestHost, getRequestProtocol, getQuery } from 'h3';
import { join } from 'pathe';
import { prefixStorage } from 'unstorage';
import sizeOf from 'image-size';
import { withBase } from 'ufo';
import { u as useRuntimeConfig, b as useStorage } from './nitro/node-server.mjs';

function useHostname(e) {
  const base = useRuntimeConfig().app.baseURL;
  let host = getRequestHost(e, { xForwardedHost: true });
  if (host === "localhost")
    host = process.env.NITRO_HOST || process.env.HOST || host;
  let protocol = getRequestProtocol(e, { xForwardedProto: true });
  const useHttp = host.includes("127.0.0.1") || host.includes("localhost") || protocol === "http";
  let port = host.includes(":") ? host.split(":").pop() : false;
  if ((host.includes("localhost")) && !port)
    port = process.env.NITRO_PORT || process.env.PORT;
  return withBase(base, `http${useHttp ? "" : "s"}://${host.includes(":") ? host.split(":")[0] : host}${port ? `:${port}` : ""}`);
}

async function fetchOptions(e, path) {
  const { runtimeCacheStorage } = useRuntimeConfig()["nuxt-og-image"];
  const cache = runtimeCacheStorage || false ? prefixStorage(useStorage(), "og-image-cache:options") : false;
  let options;
  if (cache && await cache.hasItem(path)) {
    const cachedValue = await cache.getItem(path);
    if (cachedValue && cachedValue.value && cachedValue.expiresAt < Date.now())
      options = cachedValue.value;
    else
      await cache.removeItem(path);
  }
  if (!options) {
    options = await globalThis.$fetch("/api/og-image-options", {
      query: {
        path
      },
      responseType: "json"
    });
    if (cache) {
      await cache.setItem(path, {
        value: options,
        expiresAt: Date.now() + (options.static ? 60 * 60 * 1e3 : 5 * 1e3)
      });
    }
  }
  return {
    ...options,
    // use query data
    ...getQuery(e),
    requestOrigin: useHostname(e)
  };
}
function base64ToArrayBuffer(base64) {
  const buffer = Buffer.from(base64, "base64");
  return new Uint8Array(buffer).buffer;
}
function r(base, key) {
  return join(base, key.replace(/:/g, "/"));
}
async function readPublicAsset(file, encoding) {
  const { assetDirs } = useRuntimeConfig()["nuxt-og-image"];
  for (const assetDir of assetDirs) {
    const path = r(assetDir, file);
    if (existsSync(path))
      return await promises.readFile(path, { encoding });
  }
}
async function readPublicAssetBase64(file) {
  const base64 = await readPublicAsset(file, "base64");
  if (base64) {
    const dimensions = await sizeOf(Buffer.from(base64, "base64"));
    return {
      src: toBase64Image(file, base64),
      ...dimensions
    };
  }
}
function toBase64Image(fileName, data) {
  const base64 = typeof data === "string" ? data : Buffer.from(data).toString("base64");
  let type = "image/jpeg";
  const ext = fileName.split(".").pop();
  if (ext === "svg")
    type = "image/svg+xml";
  else if (ext === "png")
    type = "image/png";
  return `data:${type};base64,${base64}`;
}

export { readPublicAssetBase64 as a, base64ToArrayBuffer as b, fetchOptions as f, readPublicAsset as r, toBase64Image as t, useHostname as u };
//# sourceMappingURL=utils.mjs.map
