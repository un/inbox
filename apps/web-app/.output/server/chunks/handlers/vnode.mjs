import { defineEventHandler, getQuery, setHeader, createError } from 'h3';
import { withBase } from 'ufo';
import { f as fetchOptions } from '../utils.mjs';
import { u as useProvider } from '../rollup/provider.mjs';
import { u as useRuntimeConfig } from '../nitro/node-server.mjs';
import 'node:fs';
import 'node:buffer';
import 'pathe';
import 'unstorage';
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

const vnode = defineEventHandler(async (e) => {
  const query = getQuery(e);
  const path = withBase(query.path || "/", useRuntimeConfig().app.baseURL);
  const options = await fetchOptions(e, path);
  setHeader(e, "Content-Type", "application/json");
  const provider = await useProvider(options.provider);
  if (!provider) {
    throw createError({
      statusCode: 500,
      statusMessage: `Provider ${options.provider} is missing.`
    });
  }
  return provider.createVNode(options);
});

export { vnode as default };
//# sourceMappingURL=vnode.mjs.map
