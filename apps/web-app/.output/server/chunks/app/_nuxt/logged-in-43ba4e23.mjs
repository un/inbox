import { m as defineNuxtRouteMiddleware, u as useAppConfig, n as navigateTo } from '../server.mjs';
import { u as useRequestEvent } from './ssr-6490d687.mjs';
import { withQuery } from 'ufo';
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

const loggedIn = /* @__PURE__ */ defineNuxtRouteMiddleware(async (to) => {
  var _a;
  const redirects = useAppConfig().hanko.redirects;
  {
    const event = useRequestEvent();
    if (!((_a = event.context.hanko) == null ? void 0 : _a.sub) && to.path !== redirects.login) {
      return navigateTo(withQuery(redirects.login, { redirect: to.path }));
    }
    return;
  }
});

export { loggedIn as default };
//# sourceMappingURL=logged-in-43ba4e23.mjs.map
