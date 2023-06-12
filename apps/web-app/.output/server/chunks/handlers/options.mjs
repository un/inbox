import { defineEventHandler, getQuery, createError } from 'h3';
import { withoutBase } from 'ufo';
import { defu } from 'defu';
import { u as useRuntimeConfig, g as getRouteRules } from '../nitro/node-server.mjs';
import { e as extractOgImageOptions } from '../utils-pure.mjs';
import 'node-fetch-native/polyfill';
import 'node:http';
import 'node:https';
import 'destr';
import 'ofetch';
import 'unenv/runtime/fetch/index';
import 'hookable';
import 'scule';
import 'klona';
import 'ohash';
import 'unstorage';
import 'radix3';
import 'node:fs';
import 'node:url';
import 'pathe';
import 'memory-cache';
import 'perf_hooks';
import 'xss';
import 'jose';

const options = defineEventHandler(async (e) => {
  const query = getQuery(e);
  const path = withoutBase(query.path || "/", useRuntimeConfig().app.baseURL);
  let html;
  try {
    html = await globalThis.$fetch(path);
  } catch (err) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to read the path ${path} for og-image extraction. ${err.message}.`
    });
  }
  const extractedPayload = extractOgImageOptions(html);
  if (!extractedPayload) {
    throw createError({
      statusCode: 500,
      statusMessage: `The path ${path} is missing the og-image payload.`
    });
  }
  e.node.req.url = path;
  const oldRouteRules = e.context._nitro.routeRules;
  e.context._nitro.routeRules = void 0;
  const routeRules = getRouteRules(e)?.ogImage;
  e.context._nitro.routeRules = oldRouteRules;
  e.node.req.url = e.path;
  if (routeRules === false)
    return false;
  const { defaults } = useRuntimeConfig()["nuxt-og-image"];
  return defu(
    extractedPayload,
    routeRules,
    // runtime options
    { path },
    defaults
  );
});

export { options as default };
//# sourceMappingURL=options.mjs.map
