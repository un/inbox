import { m as defineNuxtRouteMiddleware, u as useAppConfig, n as navigateTo } from '../server.mjs';
import { u as useRequestEvent } from './ssr-6490d687.mjs';
import 'vue';
import 'ofetch';
import 'hookable';
import 'unctx';
import 'klona';
import 'h3';
import '@unhead/ssr';
import 'unhead';
import '@unhead/shared';
import 'vue-router';
import 'ufo';
import 'vue/server-renderer';
import 'defu';
import '../../nitro/node-server.mjs';
import 'node-fetch-native/polyfill';
import 'node:http';
import 'node:https';
import 'destr';
import 'unenv/runtime/fetch/index';
import 'scule';
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

const loggedOut = /* @__PURE__ */ defineNuxtRouteMiddleware(async (to) => {
  var _a;
  const redirects = useAppConfig().hanko.redirects;
  {
    const event = useRequestEvent();
    if (((_a = event.context.hanko) == null ? void 0 : _a.sub) && to.path !== redirects.home) {
      return navigateTo(redirects.home);
    }
    return;
  }
});

export { loggedOut as default };
//# sourceMappingURL=logged-out-03f7b967.mjs.map
