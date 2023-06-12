globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import 'node-fetch-native/polyfill';
import { Server as Server$1 } from 'node:http';
import { Server } from 'node:https';
import destr from 'destr';
import { defineEventHandler, handleCacheHeaders, createEvent, eventHandler, setHeaders, sendRedirect, proxyRequest, getHeader, getCookie, createError, getRequestHeader, setResponseStatus, setResponseHeader, getRequestHeaders, getQuery as getQuery$1, readBody, handleCors, createApp, createRouter as createRouter$1, toNodeListener, fetchWithEvent, lazyEventHandler } from 'h3';
import { createFetch as createFetch$1, Headers } from 'ofetch';
import { createCall, createFetch } from 'unenv/runtime/fetch/index';
import { createHooks } from 'hookable';
import { snakeCase } from 'scule';
import { klona } from 'klona';
import defu, { defuFn } from 'defu';
import { hash } from 'ohash';
import { parseURL, withoutBase, joinURL, getQuery, withQuery, withLeadingSlash, withoutTrailingSlash } from 'ufo';
import { createStorage, prefixStorage } from 'unstorage';
import { toRouteMatcher, createRouter } from 'radix3';
import { promises } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'pathe';
import cache from 'memory-cache';
import { performance } from 'perf_hooks';
import { FilterXSS } from 'xss';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const defineAppConfig = (config) => config;

const appConfig0 = defineAppConfig({
  ui: {
    primary: "blue",
    gray: "zinc",
    badge: {
      size: {
        xs: "text-xs px-1.5 py-0.5",
        sm: "text-xs px-2 py-1",
        md: "text-sm px-2 py-1",
        lg: "text-sm px-2.5 py-1.5",
        xl: "text-base px-3 py-1.5",
        "2xl": "text-base px-4 py-2",
        "3xl": "text-lg px-4 py-2",
        "4xl": "text-lg px-5 py-2.5"
      }
    }
  },
  umami: {
    version: 2
  }
});

const appConfig1 = defineAppConfig({});

const inlineAppConfig = {
  "hanko": {
    "redirects": {
      "login": "/login",
      "home": "/",
      "success": "/dashboard",
      "followRedirect": true
    }
  },
  "umami": {
    "id": "",
    "host": "",
    "version": 1,
    "domains": "",
    "autoTrack": true,
    "ignoreDnt": true,
    "customEndpoint": "/",
    "ignoreLocalhost": false
  },
  "ui": {
    "primary": "green",
    "gray": "cool",
    "colors": [
      "red",
      "orange",
      "amber",
      "yellow",
      "lime",
      "green",
      "emerald",
      "teal",
      "cyan",
      "sky",
      "blue",
      "indigo",
      "violet",
      "purple",
      "fuchsia",
      "pink",
      "rose",
      "primary"
    ]
  }
};

const appConfig = defuFn(appConfig0, appConfig1, inlineAppConfig);

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/**": {
        "headers": {
          "Cross-Origin-Resource-Policy": "same-origin",
          "Cross-Origin-Opener-Policy": "same-origin",
          "Cross-Origin-Embedder-Policy": "require-corp",
          "Content-Security-Policy": "base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; object-src 'none'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests",
          "Origin-Agent-Cluster": "?1",
          "Referrer-Policy": "no-referrer",
          "Strict-Transport-Security": "max-age=15552000; includeSubDomains",
          "X-Content-Type-Options": "nosniff",
          "X-DNS-Prefetch-Control": "off",
          "X-Download-Options": "noopen",
          "X-Frame-Options": "SAMEORIGIN",
          "X-Permitted-Cross-Domain-Policies": "none",
          "X-XSS-Protection": "0",
          "Permissions-Policy": "camera=(), display-capture=(), fullscreen=(), geolocation=(), microphone=()"
        },
        "security": {
          "requestSizeLimiter": {
            "maxRequestSizeInBytes": 2000000,
            "maxUploadFileRequestInBytes": 8000000,
            "throwError": true
          },
          "rateLimiter": {
            "tokensPerInterval": 150,
            "interval": "hour",
            "fireImmediately": true,
            "throwError": true
          },
          "xssValidator": {
            "throwError": true
          },
          "corsHandler": {
            "origin": "http://localhost:3000",
            "methods": [
              "GET",
              "HEAD",
              "PUT",
              "PATCH",
              "POST",
              "DELETE"
            ],
            "preflight": {
              "statusCode": 204
            },
            "throwError": true
          },
          "allowedMethodsRestricter": {
            "0": "*"
          },
          "undefined": {}
        }
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {
    "hanko": {
      "apiURL": "",
      "cookieName": "hanko"
    },
    "umamiHost": "",
    "umamiId": ""
  },
  "databaseUrl": "mysql://psbmh7hbp1idvv69tfin:pscale_pw_DRuOmSm8jXuQsgQ8joLNnGm7RQmZ2ApbtX8Bz1xRM1N@aws.connect.psdb.cloud/waitlistdb?ssl={\"rejectUnauthorized\":true}",
  "emailApiUrl": "http://e.uninbox.io/api/vi/send/message",
  "emailApiKey": "3FSBIGofmwP3VsoAdMYd6uT2",
  "private": {
    "basicAuth": false
  },
  "security": {
    "headers": {
      "crossOriginResourcePolicy": "same-origin",
      "crossOriginOpenerPolicy": "same-origin",
      "crossOriginEmbedderPolicy": {
        "value": "require-corp",
        "route": "/**"
      },
      "contentSecurityPolicy": {
        "base-uri": [
          "'self'"
        ],
        "font-src": [
          "'self'",
          "https:",
          "data:"
        ],
        "form-action": [
          "'self'"
        ],
        "frame-ancestors": [
          "'self'"
        ],
        "img-src": [
          "'self'",
          "data:"
        ],
        "object-src": [
          "'none'"
        ],
        "script-src-attr": [
          "'none'"
        ],
        "style-src": [
          "'self'",
          "https:",
          "'unsafe-inline'"
        ],
        "upgrade-insecure-requests": true
      },
      "originAgentCluster": "?1",
      "referrerPolicy": "no-referrer",
      "strictTransportSecurity": {
        "maxAge": 15552000,
        "includeSubdomains": true
      },
      "xContentTypeOptions": "nosniff",
      "xDNSPrefetchControl": "off",
      "xDownloadOptions": "noopen",
      "xFrameOptions": "SAMEORIGIN",
      "xPermittedCrossDomainPolicies": "none",
      "xXSSProtection": "0",
      "permissionsPolicy": {
        "camera": [
          "()"
        ],
        "display-capture": [
          "()"
        ],
        "fullscreen": [
          "()"
        ],
        "geolocation": [
          "()"
        ],
        "microphone": [
          "()"
        ]
      }
    },
    "requestSizeLimiter": {
      "maxRequestSizeInBytes": 2000000,
      "maxUploadFileRequestInBytes": 8000000,
      "throwError": true
    },
    "rateLimiter": {
      "tokensPerInterval": 150,
      "interval": "hour",
      "fireImmediately": true,
      "throwError": true
    },
    "xssValidator": {
      "throwError": true
    },
    "corsHandler": {
      "origin": "http://localhost:3000",
      "methods": [
        "GET",
        "HEAD",
        "PUT",
        "PATCH",
        "POST",
        "DELETE"
      ],
      "preflight": {
        "statusCode": 204
      },
      "throwError": true
    },
    "allowedMethodsRestricter": "*",
    "hidePoweredBy": true,
    "enabled": true,
    "csrf": false
  },
  "nuxt-og-image": {
    "siteUrl": "https://uninbox.com",
    "defaults": {
      "component": "OgImageBasic",
      "width": 1200,
      "height": 630,
      "cacheTtl": 86400000
    },
    "runtimeSatori": true,
    "runtimeBrowser": false,
    "fonts": [
      {
        "name": "Inter",
        "weight": "400"
      },
      {
        "name": "CalSans",
        "weight": 800,
        "path": "/assets/fonts/CalSans-SemiBold.ttf"
      }
    ],
    "runtimeCacheStorage": false,
    "satoriOptions": {},
    "playground": false,
    "debug": false,
    "host": "https://uninbox.com",
    "assetDirs": [
      "/Users/omar/code/UnInbox/apps/web-app/public",
      "/Users/omar/code/UnInbox/node_modules/.pnpm/nuxt-og-image@2.0.0-beta.58_vue@3.3.4/node_modules/nuxt-og-image/dist/runtime/public-assets",
      "/Users/omar/code/UnInbox/node_modules/.pnpm/nuxt-og-image@2.0.0-beta.58_vue@3.3.4/node_modules/nuxt-og-image/dist/runtime/public-assets-optional/inter-font",
      "/Users/omar/code/UnInbox/node_modules/.pnpm/nuxt-og-image@2.0.0-beta.58_vue@3.3.4/node_modules/nuxt-og-image/dist/runtime/public-assets-optional/inter-font",
      "/Users/omar/code/UnInbox/node_modules/.pnpm/nuxt-og-image@2.0.0-beta.58_vue@3.3.4/node_modules/nuxt-og-image/dist/runtime/public-assets-optional/resvg",
      "/Users/omar/code/UnInbox/node_modules/.pnpm/nuxt-og-image@2.0.0-beta.58_vue@3.3.4/node_modules/nuxt-og-image/dist/runtime/public-assets-optional/yoga",
      "/Users/omar/code/UnInbox/node_modules/.pnpm/nuxt-og-image@2.0.0-beta.58_vue@3.3.4/node_modules/nuxt-og-image/dist/runtime/public-assets-optional/svg2png"
    ]
  }
};
const ENV_PREFIX = "NITRO_";
const ENV_PREFIX_ALT = _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_";
const _sharedRuntimeConfig = _deepFreeze(
  _applyEnv(klona(_inlineRuntimeConfig))
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  _applyEnv(runtimeConfig);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
_deepFreeze(klona(appConfig));
function _getEnv(key) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[ENV_PREFIX + envKey] ?? process.env[ENV_PREFIX_ALT + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function _applyEnv(obj, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = _getEnv(subKey);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
      }
      _applyEnv(obj[key], subKey);
    } else {
      obj[key] = envValue ?? obj[key];
    }
  }
  return obj;
}
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

const _assets = {

};

function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0].replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "");
}

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

const storage = createStorage({});

storage.mount('/assets', assets$1);

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

const defaultCacheOptions = {
  name: "_",
  base: "/cache",
  swr: true,
  maxAge: 1
};
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions, ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = hash([opts.integrity, fn, opts]);
  const validate = opts.validate || (() => true);
  async function get(key, resolver, shouldInvalidateCache) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    const entry = await useStorage().getItem(cacheKey) || {};
    const ttl = (opts.maxAge ?? opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || !validate(entry);
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry)) {
          useStorage().setItem(cacheKey, entry).catch((error) => console.error("[nitro] [cache]", error));
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (opts.swr && entry.value) {
      _resolvePromise.catch(console.error);
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = opts.shouldInvalidateCache?.(...args);
    const entry = await get(key, () => fn(...args), shouldInvalidateCache);
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
const cachedFunction = defineCachedFunction;
function getKey(...args) {
  return args.length > 0 ? hash(args, {}) : "";
}
function escapeKey(key) {
  return key.replace(/[^\dA-Za-z]/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions) {
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const key = await opts.getKey?.(event);
      if (key) {
        return escapeKey(key);
      }
      const url = event.node.req.originalUrl || event.node.req.url;
      const friendlyName = escapeKey(decodeURI(parseURL(url).pathname)).slice(
        0,
        16
      );
      const urlHash = hash(url);
      return `${friendlyName}.${urlHash}`;
    },
    validate: (entry) => {
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: [opts.integrity, handler]
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const reqProxy = cloneWithProxy(incomingEvent.node.req, { headers: {} });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            for (const header in headers2) {
              this.setHeader(header, headers2[header]);
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.context = incomingEvent.context;
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = headers.Etag || headers.etag || `W/"${hash(body)}"`;
      headers["last-modified"] = headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString();
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(event);
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      event.node.res.setHeader(name, response.headers[name]);
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler() {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      return sendRedirect(
        event,
        routeRules.redirect.to,
        routeRules.redirect.statusCode
      );
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: $fetch.raw,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    const path = new URL(event.node.req.url, "http://localhost").pathname;
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(path, useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

async function verifyHankoEvent(event) {
  const hankoConfig = useRuntimeConfig().public.hanko;
  const jwksHost = hankoConfig.apiURL;
  const JWKS = createRemoteJWKSet(new URL(`${jwksHost}/.well-known/jwks.json`));
  const cookieName = hankoConfig.cookieName;
  const jwt = getHeader(event, "authorization")?.split(" ").pop() || getCookie(event, cookieName);
  if (!jwt) {
    throw createError({
      statusCode: 401
    });
  }
  return await jwtVerify(jwt, JWKS).then((r) => r.payload);
}

const OgImagePrenderNitroPlugin = (nitroApp) => {
  return;
};
const _o0bpcEvpvc = OgImagePrenderNitroPlugin;

const script = "\"use strict\";const w=window,de=document.documentElement,knownColorSchemes=[\"dark\",\"light\"],preference=window.localStorage.getItem(\"nuxt-color-mode\")||\"system\";let value=preference===\"system\"?getColorScheme():preference;const forcedColorMode=de.getAttribute(\"data-color-mode-forced\");forcedColorMode&&(value=forcedColorMode),addColorScheme(value),w[\"__NUXT_COLOR_MODE__\"]={preference,value,getColorScheme,addColorScheme,removeColorScheme};function addColorScheme(e){const o=\"\"+e+\"\",t=\"\";de.classList?de.classList.add(o):de.className+=\" \"+o,t&&de.setAttribute(\"data-\"+t,e)}function removeColorScheme(e){const o=\"\"+e+\"\",t=\"\";de.classList?de.classList.remove(o):de.className=de.className.replace(new RegExp(o,\"g\"),\"\"),t&&de.removeAttribute(\"data-\"+t)}function prefersColorScheme(e){return w.matchMedia(\"(prefers-color-scheme\"+e+\")\")}function getColorScheme(){if(w.matchMedia&&prefersColorScheme(\"\").media!==\"not all\"){for(const e of knownColorSchemes)if(prefersColorScheme(\":\"+e).matches)return e}return\"light\"}\n";

const _uU2jBPw7I1 = (function(nitro) {
  nitro.hooks.hook("render:html", (htmlContext) => {
    htmlContext.head.push(`<script>${script}<\/script>`);
  });
});

const _2p2jY2Bj37 = (function(nitro) {
  nitro.hooks.hook("render:response", (response) => {
    if (response.headers["x-powered-by"]) {
      delete response.headers["x-powered-by"];
    } else if (response.headers["X-Powered-By"]) {
      delete response.headers["X-Powered-By"];
    }
  });
});

const plugins = [
  _o0bpcEvpvc,
_uU2jBPw7I1,
_2p2jY2Bj37
];

function hasReqHeader(event, name, includes) {
  const value = getRequestHeader(event, name);
  return value && typeof value === "string" && value.toLowerCase().includes(includes);
}
function isJsonRequest(event) {
  return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function normalizeError(error) {
  const cwd = typeof process.cwd === "function" ? process.cwd() : "/";
  const stack = (error.stack || "").split("\n").splice(1).filter((line) => line.includes("at ")).map((line) => {
    const text = line.replace(cwd + "/", "./").replace("webpack:/", "").replace("file://", "").trim();
    return {
      text,
      internal: line.includes("node_modules") && !line.includes(".cache") || line.includes("internal") || line.includes("new Promise")
    };
  });
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage ?? (statusCode === 404 ? "Not Found" : "");
  const message = error.message || error.toString();
  return {
    stack,
    statusCode,
    statusMessage,
    message
  };
}

const errorHandler = (async function errorhandler(error, event) {
  const { stack, statusCode, statusMessage, message } = normalizeError(error);
  const errorObject = {
    url: event.node.req.url,
    statusCode,
    statusMessage,
    message,
    stack: "",
    data: error.data
  };
  setResponseStatus(event, errorObject.statusCode !== 200 && errorObject.statusCode || 500, errorObject.statusMessage);
  if (error.unhandled || error.fatal) {
    const tags = [
      "[nuxt]",
      "[request error]",
      error.unhandled && "[unhandled]",
      error.fatal && "[fatal]",
      Number(errorObject.statusCode) !== 200 && `[${errorObject.statusCode}]`
    ].filter(Boolean).join(" ");
    console.error(tags, errorObject.message + "\n" + stack.map((l) => "  " + l.text).join("  \n"));
  }
  if (isJsonRequest(event)) {
    setResponseHeader(event, "Content-Type", "application/json");
    event.node.res.end(JSON.stringify(errorObject));
    return;
  }
  const isErrorPage = event.node.req.url?.startsWith("/__nuxt_error");
  const res = !isErrorPage ? await useNitroApp().localFetch(withQuery(joinURL(useRuntimeConfig().app.baseURL, "/__nuxt_error"), errorObject), {
    headers: getRequestHeaders(event),
    redirect: "manual"
  }).catch(() => null) : null;
  if (!res) {
    const { template } = await import('../error-500.mjs');
    setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
    event.node.res.end(template(errorObject));
    return;
  }
  for (const [header, value] of res.headers.entries()) {
    setResponseHeader(event, header, value);
  }
  setResponseStatus(event, res.status && res.status !== 200 ? res.status : void 0, res.statusText);
  event.node.res.end(await res.text());
});

const assets = {
  "/favicon.ico": {
    "type": "image/vnd.microsoft.icon",
    "etag": "\"576e-1XmDSu8FBFq8vyg5cOYqUFb23Fk\"",
    "mtime": "2023-06-12T14:04:13.332Z",
    "size": 22382,
    "path": "../public/favicon.ico"
  },
  "/index.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"1ea3-LKxr+v0DOYeF9PNuR/SxNLZSf2c\"",
    "mtime": "2023-06-12T14:04:14.307Z",
    "size": 7843,
    "path": "../public/index.html"
  },
  "/inter-latin-ext-400-normal.woff": {
    "type": "font/woff",
    "etag": "\"abcc-ScgUlgU6NMSchk9cXQMUZeQG8fc\"",
    "mtime": "2023-06-12T14:04:13.334Z",
    "size": 43980,
    "path": "../public/inter-latin-ext-400-normal.woff"
  },
  "/inter-latin-ext-700-normal.woff": {
    "type": "font/woff",
    "etag": "\"bb34-btkmYi1MS9GkMFR4+gGPWRFxwKU\"",
    "mtime": "2023-06-12T14:04:13.334Z",
    "size": 47924,
    "path": "../public/inter-latin-ext-700-normal.woff"
  },
  "/__nuxt_og_image__/browser-provider-not-supported.png": {
    "type": "image/png",
    "etag": "\"d15f-AEZ7IAUVAPep6OcQIDh6DGEbiYY\"",
    "mtime": "2023-06-12T14:04:13.333Z",
    "size": 53599,
    "path": "../public/__nuxt_og_image__/browser-provider-not-supported.png"
  },
  "/_nuxt/CalSans-SemiBold.c8c75bb7.woff": {
    "type": "font/woff",
    "etag": "\"cd18-EH4cKXtz9dZcmEshEwrTmLHXajo\"",
    "mtime": "2023-06-12T14:04:13.331Z",
    "size": 52504,
    "path": "../public/_nuxt/CalSans-SemiBold.c8c75bb7.woff"
  },
  "/_nuxt/CalSans-SemiBold.d3e38c94.woff2": {
    "type": "font/woff2",
    "etag": "\"9fe4-P2duH7w/VRqqnKRek7vOcXA/A9g\"",
    "mtime": "2023-06-12T14:04:13.331Z",
    "size": 40932,
    "path": "../public/_nuxt/CalSans-SemiBold.d3e38c94.woff2"
  },
  "/_nuxt/CalSans-SemiBold.ed3461b0.ttf": {
    "type": "font/ttf",
    "etag": "\"245e4-vxUq7pynHWYPSoPc93hHYfNe0TA\"",
    "mtime": "2023-06-12T14:04:13.330Z",
    "size": 148964,
    "path": "../public/_nuxt/CalSans-SemiBold.ed3461b0.ttf"
  },
  "/_nuxt/dashboard.8ec8d47c.js": {
    "type": "application/javascript",
    "etag": "\"c9-3HyrEF5H76SrjEESGjdA1cwn5Vw\"",
    "mtime": "2023-06-12T14:04:13.328Z",
    "size": 201,
    "path": "../public/_nuxt/dashboard.8ec8d47c.js"
  },
  "/_nuxt/entry.6e0bb9f0.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"acce9-H4lx+NlRJMAWi+TA4nt2Pk9Ub9M\"",
    "mtime": "2023-06-12T14:04:13.328Z",
    "size": 707817,
    "path": "../public/_nuxt/entry.6e0bb9f0.css"
  },
  "/_nuxt/entry.d61c7a91.js": {
    "type": "application/javascript",
    "etag": "\"4f09b-QrLIMsCEs5/Xoj40aI82D9MouUU\"",
    "mtime": "2023-06-12T14:04:13.327Z",
    "size": 323739,
    "path": "../public/_nuxt/entry.d61c7a91.js"
  },
  "/_nuxt/error-404.2452f020.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"e70-gTkDPGnHdhrf8awrvqIAdinT9F4\"",
    "mtime": "2023-06-12T14:04:13.326Z",
    "size": 3696,
    "path": "../public/_nuxt/error-404.2452f020.css"
  },
  "/_nuxt/error-404.eaeb1cbd.js": {
    "type": "application/javascript",
    "etag": "\"8ab-Nz3cgrgNUuYwt7XE31srsimR26M\"",
    "mtime": "2023-06-12T14:04:13.325Z",
    "size": 2219,
    "path": "../public/_nuxt/error-404.eaeb1cbd.js"
  },
  "/_nuxt/error-500.768fc9a4.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"7e0-600iimnyyFknoGRZVZ1zNADgcOY\"",
    "mtime": "2023-06-12T14:04:13.325Z",
    "size": 2016,
    "path": "../public/_nuxt/error-500.768fc9a4.css"
  },
  "/_nuxt/error-500.ea503f4e.js": {
    "type": "application/javascript",
    "etag": "\"753-nm+Il8fVjHPDyXLwk1QWUSVgbJQ\"",
    "mtime": "2023-06-12T14:04:13.324Z",
    "size": 1875,
    "path": "../public/_nuxt/error-500.ea503f4e.js"
  },
  "/_nuxt/error-component.1b387628.js": {
    "type": "application/javascript",
    "etag": "\"45e-w5/9gOVxDZ45SLVmdjXBNL6M+ng\"",
    "mtime": "2023-06-12T14:04:13.324Z",
    "size": 1118,
    "path": "../public/_nuxt/error-component.1b387628.js"
  },
  "/_nuxt/index.022d1440.js": {
    "type": "application/javascript",
    "etag": "\"e3-OCc1HolAT6mnq8W3bg8VFY9oQTQ\"",
    "mtime": "2023-06-12T14:04:13.323Z",
    "size": 227,
    "path": "../public/_nuxt/index.022d1440.js"
  },
  "/_nuxt/index.4841c8cb.js": {
    "type": "application/javascript",
    "etag": "\"103e0-c4D7B4LmhYRXDZNnHxmLx/b74Jg\"",
    "mtime": "2023-06-12T14:04:13.322Z",
    "size": 66528,
    "path": "../public/_nuxt/index.4841c8cb.js"
  },
  "/_nuxt/index.58bded39.js": {
    "type": "application/javascript",
    "etag": "\"78-NJDCu9Ref+QfhRMfRIhaLKQyyzQ\"",
    "mtime": "2023-06-12T14:04:13.321Z",
    "size": 120,
    "path": "../public/_nuxt/index.58bded39.js"
  },
  "/_nuxt/logged-in.cc7267ba.js": {
    "type": "application/javascript",
    "etag": "\"1a6-Fy3lUlPscG9nM8zhNcMy855ahUg\"",
    "mtime": "2023-06-12T14:04:13.321Z",
    "size": 422,
    "path": "../public/_nuxt/logged-in.cc7267ba.js"
  },
  "/_nuxt/logged-out.17c12b96.js": {
    "type": "application/javascript",
    "etag": "\"1b6-rP6KSCG+eOGOasqu4S8ARUnwUZQ\"",
    "mtime": "2023-06-12T14:04:13.320Z",
    "size": 438,
    "path": "../public/_nuxt/logged-out.17c12b96.js"
  },
  "/_nuxt/login.bc91a9ad.js": {
    "type": "application/javascript",
    "etag": "\"d7-r6ramb9I85eoF0wOUhLKXR6oWuE\"",
    "mtime": "2023-06-12T14:04:13.320Z",
    "size": 215,
    "path": "../public/_nuxt/login.bc91a9ad.js"
  },
  "/_nuxt/oss-friends.07bb0dae.js": {
    "type": "application/javascript",
    "etag": "\"a9ca-U5e26htC9paq7jwj0opcxAps7hE\"",
    "mtime": "2023-06-12T14:04:13.317Z",
    "size": 43466,
    "path": "../public/_nuxt/oss-friends.07bb0dae.js"
  }
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {"/_nuxt":{"maxAge":31536000}};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _f4b49z = eventHandler((event) => {
  if (event.node.req.method && !METHODS.has(event.node.req.method)) {
    return;
  }
  let id = decodeURIComponent(
    withLeadingSlash(
      withoutTrailingSlash(parseURL(event.node.req.url).pathname)
    )
  );
  let asset;
  const encodingHeader = String(
    event.node.req.headers["accept-encoding"] || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  if (encodings.length > 1) {
    event.node.res.setHeader("Vary", "Accept-Encoding");
  }
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      event.node.res.removeHeader("cache-control");
      throw createError({
        statusMessage: "Cannot find static asset " + id,
        statusCode: 404
      });
    }
    return;
  }
  const ifNotMatch = event.node.req.headers["if-none-match"] === asset.etag;
  if (ifNotMatch) {
    event.node.res.statusCode = 304;
    event.node.res.end();
    return;
  }
  const ifModifiedSinceH = event.node.req.headers["if-modified-since"];
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    event.node.res.statusCode = 304;
    event.node.res.end();
    return;
  }
  if (asset.type && !event.node.res.getHeader("Content-Type")) {
    event.node.res.setHeader("Content-Type", asset.type);
  }
  if (asset.etag && !event.node.res.getHeader("ETag")) {
    event.node.res.setHeader("ETag", asset.etag);
  }
  if (asset.mtime && !event.node.res.getHeader("Last-Modified")) {
    event.node.res.setHeader("Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !event.node.res.getHeader("Content-Encoding")) {
    event.node.res.setHeader("Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !event.node.res.getHeader("Content-Length")) {
    event.node.res.setHeader("Content-Length", asset.size);
  }
  return readAsset(id);
});

const FILE_UPLOAD_HEADER = "multipart/form-data";
const _MbYUnx = defineEventHandler(async (event) => {
  const routeRules = getRouteRules(event);
  if (routeRules.security.requestSizeLimiter !== false) {
    if (["POST", "PUT", "DELETE"].includes(event.node.req.method)) {
      const contentLengthValue = getRequestHeader(event, "content-length");
      const contentTypeValue = getRequestHeader(event, "content-type");
      const isFileUpload = contentTypeValue?.includes(FILE_UPLOAD_HEADER);
      const requestLimit = isFileUpload ? routeRules.security.requestSizeLimiter.maxUploadFileRequestInBytes : routeRules.security.requestSizeLimiter.maxRequestSizeInBytes;
      if (parseInt(contentLengthValue) >= requestLimit) {
        const payloadTooLargeError = {
          statusCode: 413,
          statusMessage: "Payload Too Large"
        };
        if (routeRules.security.requestSizeLimiter.throwError === false) {
          return payloadTooLargeError;
        }
        throw createError(payloadTooLargeError);
      }
    }
  }
});

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
function hrtime(previousTimestamp) {
    const clocktime = performance.now() * 1e-3;
    let seconds = Math.floor(clocktime);
    let nanoseconds = Math.floor((clocktime % 1) * 1e9);
    if (previousTimestamp != undefined) {
        seconds = seconds - previousTimestamp[0];
        nanoseconds = nanoseconds - previousTimestamp[1];
        if (nanoseconds < 0) {
            seconds--;
            nanoseconds += 1e9;
        }
    }
    return [seconds, nanoseconds];
}
// The current timestamp in whole milliseconds
function getMilliseconds() {
    const [seconds, nanoseconds] = hrtime();
    return seconds * 1e3 + Math.floor(nanoseconds / 1e6);
}
// Wait for a specified number of milliseconds before fulfilling the returned promise.
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A hierarchical token bucket for rate limiting. See
 * http://en.wikipedia.org/wiki/Token_bucket for more information.
 *
 * @param options
 * @param options.bucketSize Maximum number of tokens to hold in the bucket.
 *  Also known as the burst rate.
 * @param options.tokensPerInterval Number of tokens to drip into the bucket
 *  over the course of one interval.
 * @param options.interval The interval length in milliseconds, or as
 *  one of the following strings: 'second', 'minute', 'hour', day'.
 * @param options.parentBucket Optional. A token bucket that will act as
 *  the parent of this bucket.
 */
class TokenBucket {
    constructor({ bucketSize, tokensPerInterval, interval, parentBucket }) {
        this.bucketSize = bucketSize;
        this.tokensPerInterval = tokensPerInterval;
        if (typeof interval === "string") {
            switch (interval) {
                case "sec":
                case "second":
                    this.interval = 1000;
                    break;
                case "min":
                case "minute":
                    this.interval = 1000 * 60;
                    break;
                case "hr":
                case "hour":
                    this.interval = 1000 * 60 * 60;
                    break;
                case "day":
                    this.interval = 1000 * 60 * 60 * 24;
                    break;
                default:
                    throw new Error("Invalid interval " + interval);
            }
        }
        else {
            this.interval = interval;
        }
        this.parentBucket = parentBucket;
        this.content = 0;
        this.lastDrip = getMilliseconds();
    }
    /**
     * Remove the requested number of tokens. If the bucket (and any parent
     * buckets) contains enough tokens this will happen immediately. Otherwise,
     * the removal will happen when enough tokens become available.
     * @param count The number of tokens to remove.
     * @returns A promise for the remainingTokens count.
     */
    async removeTokens(count) {
        // Is this an infinite size bucket?
        if (this.bucketSize === 0) {
            return Number.POSITIVE_INFINITY;
        }
        // Make sure the bucket can hold the requested number of tokens
        if (count > this.bucketSize) {
            throw new Error(`Requested tokens ${count} exceeds bucket size ${this.bucketSize}`);
        }
        // Drip new tokens into this bucket
        this.drip();
        const comeBackLater = async () => {
            // How long do we need to wait to make up the difference in tokens?
            const waitMs = Math.ceil((count - this.content) * (this.interval / this.tokensPerInterval));
            await wait(waitMs);
            return this.removeTokens(count);
        };
        // If we don't have enough tokens in this bucket, come back later
        if (count > this.content)
            return comeBackLater();
        if (this.parentBucket != undefined) {
            // Remove the requested from the parent bucket first
            const remainingTokens = await this.parentBucket.removeTokens(count);
            // Check that we still have enough tokens in this bucket
            if (count > this.content)
                return comeBackLater();
            // Tokens were removed from the parent bucket, now remove them from
            // this bucket. Note that we look at the current bucket and parent
            // bucket's remaining tokens and return the smaller of the two values
            this.content -= count;
            return Math.min(remainingTokens, this.content);
        }
        else {
            // Remove the requested tokens from this bucket
            this.content -= count;
            return this.content;
        }
    }
    /**
     * Attempt to remove the requested number of tokens and return immediately.
     * If the bucket (and any parent buckets) contains enough tokens this will
     * return true, otherwise false is returned.
     * @param {Number} count The number of tokens to remove.
     * @param {Boolean} True if the tokens were successfully removed, otherwise
     *  false.
     */
    tryRemoveTokens(count) {
        // Is this an infinite size bucket?
        if (!this.bucketSize)
            return true;
        // Make sure the bucket can hold the requested number of tokens
        if (count > this.bucketSize)
            return false;
        // Drip new tokens into this bucket
        this.drip();
        // If we don't have enough tokens in this bucket, return false
        if (count > this.content)
            return false;
        // Try to remove the requested tokens from the parent bucket
        if (this.parentBucket && !this.parentBucket.tryRemoveTokens(count))
            return false;
        // Remove the requested tokens from this bucket and return
        this.content -= count;
        return true;
    }
    /**
     * Add any new tokens to the bucket since the last drip.
     * @returns {Boolean} True if new tokens were added, otherwise false.
     */
    drip() {
        if (this.tokensPerInterval === 0) {
            const prevContent = this.content;
            this.content = this.bucketSize;
            return this.content > prevContent;
        }
        const now = getMilliseconds();
        const deltaMS = Math.max(now - this.lastDrip, 0);
        this.lastDrip = now;
        const dripAmount = deltaMS * (this.tokensPerInterval / this.interval);
        const prevContent = this.content;
        this.content = Math.min(this.content + dripAmount, this.bucketSize);
        return Math.floor(this.content) > Math.floor(prevContent);
    }
}

/**
 * A generic rate limiter. Underneath the hood, this uses a token bucket plus
 * an additional check to limit how many tokens we can remove each interval.
 *
 * @param options
 * @param options.tokensPerInterval Maximum number of tokens that can be
 *  removed at any given moment and over the course of one interval.
 * @param options.interval The interval length in milliseconds, or as
 *  one of the following strings: 'second', 'minute', 'hour', day'.
 * @param options.fireImmediately Whether or not the promise will resolve
 *  immediately when rate limiting is in effect (default is false).
 */
class RateLimiter {
    constructor({ tokensPerInterval, interval, fireImmediately }) {
        this.tokenBucket = new TokenBucket({
            bucketSize: tokensPerInterval,
            tokensPerInterval,
            interval,
        });
        // Fill the token bucket to start
        this.tokenBucket.content = tokensPerInterval;
        this.curIntervalStart = getMilliseconds();
        this.tokensThisInterval = 0;
        this.fireImmediately = fireImmediately !== null && fireImmediately !== void 0 ? fireImmediately : false;
    }
    /**
     * Remove the requested number of tokens. If the rate limiter contains enough
     * tokens and we haven't spent too many tokens in this interval already, this
     * will happen immediately. Otherwise, the removal will happen when enough
     * tokens become available.
     * @param count The number of tokens to remove.
     * @returns A promise for the remainingTokens count.
     */
    async removeTokens(count) {
        // Make sure the request isn't for more than we can handle
        if (count > this.tokenBucket.bucketSize) {
            throw new Error(`Requested tokens ${count} exceeds maximum tokens per interval ${this.tokenBucket.bucketSize}`);
        }
        const now = getMilliseconds();
        // Advance the current interval and reset the current interval token count
        // if needed
        if (now < this.curIntervalStart || now - this.curIntervalStart >= this.tokenBucket.interval) {
            this.curIntervalStart = now;
            this.tokensThisInterval = 0;
        }
        // If we don't have enough tokens left in this interval, wait until the
        // next interval
        if (count > this.tokenBucket.tokensPerInterval - this.tokensThisInterval) {
            if (this.fireImmediately) {
                return -1;
            }
            else {
                const waitMs = Math.ceil(this.curIntervalStart + this.tokenBucket.interval - now);
                await wait(waitMs);
                const remainingTokens = await this.tokenBucket.removeTokens(count);
                this.tokensThisInterval += count;
                return remainingTokens;
            }
        }
        // Remove the requested number of tokens from the token bucket
        const remainingTokens = await this.tokenBucket.removeTokens(count);
        this.tokensThisInterval += count;
        return remainingTokens;
    }
    /**
     * Attempt to remove the requested number of tokens and return immediately.
     * If the bucket (and any parent buckets) contains enough tokens and we
     * haven't spent too many tokens in this interval already, this will return
     * true. Otherwise, false is returned.
     * @param {Number} count The number of tokens to remove.
     * @param {Boolean} True if the tokens were successfully removed, otherwise
     *  false.
     */
    tryRemoveTokens(count) {
        // Make sure the request isn't for more than we can handle
        if (count > this.tokenBucket.bucketSize)
            return false;
        const now = getMilliseconds();
        // Advance the current interval and reset the current interval token count
        // if needed
        if (now < this.curIntervalStart || now - this.curIntervalStart >= this.tokenBucket.interval) {
            this.curIntervalStart = now;
            this.tokensThisInterval = 0;
        }
        // If we don't have enough tokens left in this interval, return false
        if (count > this.tokenBucket.tokensPerInterval - this.tokensThisInterval)
            return false;
        // Try to remove the requested number of tokens from the token bucket
        const removed = this.tokenBucket.tryRemoveTokens(count);
        if (removed) {
            this.tokensThisInterval += count;
        }
        return removed;
    }
    /**
     * Returns the number of tokens remaining in the TokenBucket.
     * @returns {Number} The number of tokens remaining.
     */
    getTokensRemaining() {
        this.tokenBucket.drip();
        return this.tokenBucket.content;
    }
}

const _aLSJBj = defineEventHandler(async (event) => {
  const ip = getRequestHeader(event, "x-forwarded-for");
  const routeRules = getRouteRules(event);
  if (routeRules.security.rateLimiter !== false) {
    if (!cache.get(ip)) {
      const cachedLimiter = new RateLimiter(routeRules.security.rateLimiter);
      cache.put(ip, cachedLimiter, 1e4);
    } else {
      const cachedLimiter = cache.get(ip);
      if (cachedLimiter.getTokensRemaining() > 1) {
        await cachedLimiter.removeTokens(1);
        cache.put(ip, cachedLimiter, 1e4);
      } else {
        const tooManyRequestsError = {
          statusCode: 429,
          statusMessage: "Too Many Requests"
        };
        if (routeRules.security.rateLimiter.throwError === false) {
          return tooManyRequestsError;
        }
        throw createError(tooManyRequestsError);
      }
    }
  }
});

const _9YCg8c = defineEventHandler(async (event) => {
  const routeRules = getRouteRules(event);
  const xssValidator = new FilterXSS(routeRules.security.xssValidator);
  if (routeRules.security.xssValidator !== false) {
    if (["POST", "GET"].includes(event.node.req.method)) {
      const valueToFilter = event.node.req.method === "GET" ? getQuery$1(event) : await readBody(event);
      if (valueToFilter && Object.keys(valueToFilter).length) {
        if (valueToFilter.statusMessage && valueToFilter.statusMessage !== "Bad Request")
          return;
        const stringifiedValue = JSON.stringify(valueToFilter);
        const processedValue = xssValidator.process(JSON.stringify(valueToFilter));
        if (processedValue !== stringifiedValue) {
          const badRequestError = { statusCode: 400, statusMessage: "Bad Request" };
          if (routeRules.security.requestSizeLimiter.throwError === false) {
            return badRequestError;
          }
          throw createError(badRequestError);
        }
      }
    }
  }
});

const _3hjpmG = defineEventHandler((event) => {
  const routeRules = getRouteRules(event);
  handleCors(event, routeRules.security.corsHandler);
});

const _q8OKPu = defineEventHandler(async (event) => {
  event.context.hanko = await verifyHankoEvent(event).catch(() => void 0);
});

const _lazy_ohC22m = () => import('../waitlist.post.mjs');
const _lazy_9oQRF6 = () => import('../handlers/renderer.mjs');
const _lazy_ltLG4u = () => import('../handlers/og.png.mjs');
const _lazy_1n0Frz = () => import('../handlers/html.mjs');
const _lazy_3Sdhta = () => import('../handlers/options.mjs');
const _lazy_q6OHiL = () => import('../handlers/svg.mjs');
const _lazy_KNtwmJ = () => import('../handlers/vnode.mjs');
const _lazy_ynesJt = () => import('../handlers/font.mjs');

const handlers = [
  { route: '', handler: _f4b49z, lazy: false, middleware: true, method: undefined },
  { route: '/api/waitlist', handler: _lazy_ohC22m, lazy: true, middleware: false, method: "post" },
  { route: '/__nuxt_error', handler: _lazy_9oQRF6, lazy: true, middleware: false, method: undefined },
  { route: '', handler: _MbYUnx, lazy: false, middleware: false, method: undefined },
  { route: '', handler: _aLSJBj, lazy: false, middleware: false, method: undefined },
  { route: '', handler: _9YCg8c, lazy: false, middleware: false, method: undefined },
  { route: '', handler: _3hjpmG, lazy: false, middleware: false, method: undefined },
  { route: '', handler: _q8OKPu, lazy: false, middleware: true, method: undefined },
  { route: '', handler: _lazy_ltLG4u, lazy: true, middleware: false, method: undefined },
  { route: '/api/og-image-html', handler: _lazy_1n0Frz, lazy: true, middleware: false, method: undefined },
  { route: '/api/og-image-options', handler: _lazy_3Sdhta, lazy: true, middleware: false, method: undefined },
  { route: '/api/og-image-svg', handler: _lazy_q6OHiL, lazy: true, middleware: false, method: undefined },
  { route: '/api/og-image-vnode', handler: _lazy_KNtwmJ, lazy: true, middleware: false, method: undefined },
  { route: '/api/og-image-font', handler: _lazy_ynesJt, lazy: true, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_9oQRF6, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const h3App = createApp({
    debug: destr(false),
    onError: errorHandler
  });
  const router = createRouter$1();
  h3App.use(createRouteRulesHandler());
  const localCall = createCall(toNodeListener(h3App));
  const localFetch = createFetch(localCall, globalThis.fetch);
  const $fetch = createFetch$1({
    fetch: localFetch,
    Headers,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(
    eventHandler((event) => {
      event.context.nitro = event.context.nitro || {};
      const envContext = event.node.req.__unenv__;
      if (envContext) {
        Object.assign(event.context, envContext);
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: $fetch });
    })
  );
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch
  };
  for (const plugin of plugins) {
    plugin(app);
  }
  return app;
}
const nitroApp = createNitroApp();
const useNitroApp = () => nitroApp;

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const server = cert && key ? new Server({ key, cert }, toNodeListener(nitroApp.h3App)) : new Server$1(toNodeListener(nitroApp.h3App));
const port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
const host = process.env.NITRO_HOST || process.env.HOST;
const s = server.listen(port, host, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const i = s.address();
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${i.family === "IPv6" ? `[${i.address}]` : i.address}:${i.port}${baseURL}`;
  console.log(`Listening ${url}`);
});
{
  process.on(
    "unhandledRejection",
    (err) => console.error("[nitro] [dev] [unhandledRejection] " + err)
  );
  process.on(
    "uncaughtException",
    (err) => console.error("[nitro] [dev] [uncaughtException] " + err)
  );
}
const nodeServer = {};

export { useNitroApp as a, useStorage as b, cachedEventHandler as c, getRouteRules as g, nodeServer as n, useRuntimeConfig as u };
//# sourceMappingURL=node-server.mjs.map
