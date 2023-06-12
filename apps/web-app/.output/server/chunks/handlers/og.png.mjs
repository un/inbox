import { Buffer } from 'node:buffer';
import { defineEventHandler, sendRedirect, createError, setHeader } from 'h3';
import { parseURL, withoutTrailingSlash, joinURL } from 'ufo';
import { prefixStorage } from 'unstorage';
import { f as fetchOptions, u as useHostname } from '../utils.mjs';
import { u as useProvider } from '../rollup/provider.mjs';
import { u as useRuntimeConfig, b as useStorage } from '../nitro/node-server.mjs';
import 'node:fs';
import 'pathe';
import 'image-size';
import 'satori-html';
import '../utils-pure.mjs';
import '@resvg/resvg-js';
import 'satori';
import 'node-fetch-native/polyfill';
import 'node:http';
import 'node:https';
import 'destr';
import 'ofetch';
import 'unenv/runtime/fetch/index';
import 'hookable';
import 'scule';
import 'klona';
import 'defu';
import 'ohash';
import 'radix3';
import 'node:url';
import 'memory-cache';
import 'perf_hooks';
import 'xss';
import 'jose';

const og_png = defineEventHandler(async (e) => {
  const { runtimeBrowser, runtimeCacheStorage } = useRuntimeConfig()["nuxt-og-image"];
  const path = parseURL(e.path).pathname;
  if (!path.endsWith("__og_image__/og.png"))
    return;
  const basePath = withoutTrailingSlash(
    path.replace("__og_image__/og.png", "")
  );
  const options = await fetchOptions(e, basePath);
  if (!runtimeBrowser && options.provider === "browser")
    return sendRedirect(e, joinURL(useHostname(e), "__nuxt_og_image__/browser-provider-not-supported.png"));
  const provider = await useProvider(options.provider);
  if (!provider) {
    throw createError({
      statusCode: 500,
      statusMessage: `Provider ${options.provider} is missing.`
    });
  }
  const useCache = runtimeCacheStorage && !false && options.cacheTtl && options.cacheTtl > 0;
  const cache = prefixStorage(useStorage(), "og-image-cache:images");
  const key = options.cacheKey || e.node.req.url;
  let png;
  if (useCache && await cache.hasItem(key)) {
    const { value, expiresAt } = await cache.getItem(key);
    if (expiresAt > Date.now()) {
      setHeader(e, "Cache-Control", "public, max-age=31536000");
      setHeader(e, "Content-Type", "image/png");
      png = Buffer.from(value, "base64");
    } else {
      await cache.removeItem(key);
    }
  }
  if (!png) {
    try {
      png = await provider.createPng(options);
      if (useCache && png) {
        const base64png = Buffer.from(png).toString("base64");
        await cache.setItem(key, { value: base64png, expiresAt: Date.now() + (options.cacheTtl || 0) });
      }
    } catch (err) {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create og image: ${err.message}`
      });
    }
  }
  if (png) {
    if (options.static) {
      setHeader(e, "Cache-Control", "public, max-age=31536000");
    } else {
      setHeader(e, "Cache-Control", "no-cache, no-store, must-revalidate");
      setHeader(e, "Pragma", "no-cache");
      setHeader(e, "Expires", "0");
    }
    setHeader(e, "Content-Type", "image/png");
    return png;
  }
  throw createError({
    statusCode: 500,
    statusMessage: "Failed to create og image, unknown error."
  });
});

export { og_png as default };
//# sourceMappingURL=og.png.mjs.map
