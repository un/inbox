import { withBase } from 'ufo';
import { renderSSRHead } from '@unhead/ssr';
import { defineEventHandler, getQuery, sendRedirect, createError } from 'h3';
import { hash } from 'ohash';
import twemoji from 'twemoji';
import { f as fetchOptions, u as useHostname } from '../utils.mjs';
import { u as useRuntimeConfig } from '../nitro/node-server.mjs';
import { createHeadCore } from 'unhead';
import 'node:fs';
import 'node:buffer';
import 'pathe';
import 'unstorage';
import 'image-size';
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
import 'radix3';
import 'node:url';
import 'memory-cache';
import 'perf_hooks';
import 'xss';
import 'jose';

const html = defineEventHandler(async (e) => {
  const { fonts, defaults, satoriOptions } = useRuntimeConfig()["nuxt-og-image"];
  const query = getQuery(e);
  const path = withBase(query.path || "/", useRuntimeConfig().app.baseURL);
  const scale = query.scale;
  const mode = query.mode || "light";
  let options;
  if (query.options) {
    try {
      options = JSON.parse(query.options);
    } catch {
    }
  }
  if (!options)
    options = await fetchOptions(e, path);
  if (options.provider === "browser" && !options.component) {
    const pathWithoutBase = path.replace(new RegExp(`^${useRuntimeConfig().app.baseURL}`), "");
    return sendRedirect(e, withBase(pathWithoutBase, useHostname(e)));
  }
  if (!options.component) {
    throw createError({
      statusCode: 500,
      statusMessage: `Nuxt OG Image trying to render an invalid component. Received options ${JSON.stringify(options)}`
    });
  }
  const hashId = hash([options.component, options]);
  const island = await $fetch(`/__nuxt_island/${options.component}:${hashId}`, {
    params: {
      props: JSON.stringify(options)
    }
  });
  const head = createHeadCore();
  head.push(island.head);
  let defaultFontFamily = "sans-serif";
  const firstFont = fonts[0];
  if (firstFont)
    defaultFontFamily = firstFont.name;
  let html = island.html;
  try {
    html = twemoji.parse(html, {
      folder: "svg",
      ext: ".svg"
    });
  } catch (e2) {
  }
  head.push({
    style: [
      {
        // default font is the first font family
        innerHTML: `body { font-family: '${defaultFontFamily.replace("+", " ")}', sans-serif;  }`
      },
      {
        innerHTML: `body {
    transform: scale(${scale || 1});
    transform-origin: top left;
    max-height: 100vh;
    position: relative;
    width: ${defaults.width}px;
    height: ${defaults.height}px;
    overflow: hidden;
    background-color: ${mode === "dark" ? "#1b1b1b" : "#fff"};
}
img.emoji {
   height: 1em;
   width: 1em;
   margin: 0 .05em 0 .1em;
   vertical-align: -0.1em;
}`
      },
      ...fonts.filter((font) => font.path).map((font) => {
        return `
          @font-face {
            font-family: '${font.name}';
            font-style: normal;
            font-weight: ${font.weight};
            src: url('${font.path}') format('truetype');
          }
          `;
      })
    ],
    meta: [
      {
        charset: "utf-8"
      }
    ],
    script: [
      {
        src: "https://cdn.tailwindcss.com"
      },
      {
        innerHTML: `tailwind.config = {
  corePlugins: {
    preflight: false,
  },
  theme: ${JSON.stringify(satoriOptions?.tailwindConfig?.theme || {})}
}`
      }
    ],
    link: [
      {
        // reset css to match svg output
        href: "https://cdn.jsdelivr.net/npm/gardevoir",
        rel: "stylesheet"
      },
      // have to add each weight as their own stylesheet
      ...fonts.filter((font) => !font.path).map((font) => {
        return {
          href: `https://fonts.googleapis.com/css2?family=${font.name}:wght@${font.weight}&display=swap`,
          rel: "stylesheet"
        };
      })
    ]
  });
  const headChunk = await renderSSRHead(head);
  let htmlTemplate = `<!DOCTYPE html>
<html ${headChunk.htmlAttrs}>
<head>${headChunk.headTags}</head>
<body ${headChunk.bodyAttrs}>${headChunk.bodyTagsOpen}<div style="position: relative; display: flex; margin: 0 auto; width: 1200px; height: 630px;">${html}</div>${headChunk.bodyTags}</body>
</html>`;
  let hasInlineStyles = false;
  const stylesheets = htmlTemplate.match(/<link rel="stylesheet" href=".*?">/g);
  if (stylesheets) {
    for (const stylesheet of stylesheets) {
      if (!stylesheet.includes(`${options.component}.vue`)) {
        htmlTemplate = htmlTemplate.replace(stylesheet, "");
      } else {
        const href = stylesheet.match(/href="(.*?)"/)[1];
        try {
          let css = await (await $fetch(href, {
            baseURL: useHostname(e)
          })).text();
          if (css.includes("const __vite__css =")) {
            css = css.match(/const __vite__css = "(.*)"/)[1].replace(/\\n/g, "\n");
          }
          htmlTemplate = htmlTemplate.replace(stylesheet, `<style>${css.replace(/\/\/# sourceMappingURL=.*/, "")}</style>`);
          hasInlineStyles = true;
        } catch {
        }
      }
    }
  }
  try {
    if (hasInlineStyles) {
      const inlineCss = await import('inline-css').then((m) => m?.default || m);
      htmlTemplate = inlineCss(htmlTemplate, {
        url: useHostname(e),
        applyLinkTags: false,
        removeLinkTags: false,
        removeStyleTags: false
      });
    }
  } catch {
  }
  return htmlTemplate;
});

export { html as default };
//# sourceMappingURL=html.mjs.map
