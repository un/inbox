import { l as useRouter, g as useRuntimeConfig, k as useServerHead } from '../server.mjs';
import { u as useRequestEvent } from './ssr-6490d687.mjs';
import { withBase } from 'ufo';
import { getRequestHost, getRequestProtocol } from 'h3';

function useHostname(e) {
  const base = useRuntimeConfig().app.baseURL;
  let host = getRequestHost(e, { xForwardedHost: true });
  if (host === "localhost")
    host = process.env.NITRO_HOST || process.env.HOST || host;
  let protocol = getRequestProtocol(e, { xForwardedProto: true });
  const useHttp = host.includes("127.0.0.1") || host.includes("localhost") || protocol === "http";
  let port = host.includes(":") ? host.split(":").pop() : false;
  if (host.includes("localhost") && !port)
    port = process.env.NITRO_PORT || process.env.PORT;
  return withBase(base, `http${useHttp ? "" : "s"}://${host.includes(":") ? host.split(":")[0] : host}${port ? `:${port}` : ""}`);
}
function defineOgImageScreenshot(options = {}) {
  var _a, _b;
  const router = useRouter();
  const route = ((_b = (_a = router == null ? void 0 : router.currentRoute) == null ? void 0 : _a.value) == null ? void 0 : _b.path) || "";
  defineOgImage({
    alt: `Web page screenshot${route ? ` of ${route}` : ""}.`,
    provider: "browser",
    component: null,
    static: true,
    ...options
  });
}
function defineOgImageStatic(options = {}) {
  const { runtimeSatori } = useRuntimeConfig()["nuxt-og-image"];
  defineOgImage({
    provider: runtimeSatori ? "satori" : "browser",
    static: true,
    ...options
  });
}
function defineOgImage(options = {}) {
  var _a, _b;
  {
    let resolveSrc = function() {
      return withBase(`${route === "/" ? "" : route}/__og_image__/og.png`, baseUrl);
    };
    const { defaults, siteUrl } = useRuntimeConfig()["nuxt-og-image"];
    const router = useRouter();
    const route = ((_b = (_a = router == null ? void 0 : router.currentRoute) == null ? void 0 : _a.value) == null ? void 0 : _b.path) || "";
    const e = useRequestEvent();
    const baseUrl = useHostname(e);
    const meta = [
      {
        name: "twitter:card",
        content: "summary_large_image"
      },
      {
        name: "twitter:image:src",
        content: resolveSrc
      },
      {
        property: "og:image",
        content: resolveSrc
      },
      {
        property: "og:image:width",
        content: options.width || defaults.width
      },
      {
        property: "og:image:height",
        content: options.height || defaults.height
      }
    ];
    if (options.alt) {
      meta.push({
        property: "og:image:alt",
        content: options.alt
      });
    }
    useServerHead({
      meta,
      script: [
        {
          id: "nuxt-og-image-options",
          type: "application/json",
          innerHTML: () => {
            const payload = {
              title: "%s"
            };
            Object.entries(options).forEach(([key, val]) => {
              payload[key.replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = val;
            });
            return payload;
          }
        }
      ]
    });
  }
}

export { defineOgImageStatic as a, defineOgImageScreenshot as d };
//# sourceMappingURL=defineOgImage-7646755d.mjs.map
