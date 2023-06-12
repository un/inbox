import { html } from 'satori-html';
import { Buffer } from 'node:buffer';
import { b as base64ToArrayBuffer, r as readPublicAsset, a as readPublicAssetBase64, t as toBase64Image } from '../utils.mjs';
import { b as useStorage, u as useRuntimeConfig } from '../nitro/node-server.mjs';
import { withBase } from 'ufo';
import sizeOf from 'image-size';
import { d as decodeHtml } from '../utils-pure.mjs';
import { Resvg } from '@resvg/resvg-js';
import satori$2 from 'satori';

const cachedFonts = {};
async function loadFont(requestOrigin, font) {
  const fontKey = `${font.name}:${font.weight}`;
  const storageKey = `assets:nuxt-og-image:font:${fontKey}`;
  if (cachedFonts[fontKey])
    return cachedFonts[fontKey];
  const [name, weight] = fontKey.split(":");
  let data;
  if (await useStorage().hasItem(storageKey))
    data = base64ToArrayBuffer(await useStorage().getItem(storageKey));
  if (!data && name === "Inter" && ["400", "700"].includes(weight)) {
    data = await readPublicAsset(`/inter-latin-ext-${weight}-normal.woff`);
  }
  if (font.path) {
    data = await readPublicAsset(font.path);
    if (!data) {
      try {
        data = await globalThis.$fetch(font.path, {
          responseType: "arrayBuffer",
          baseURL: requestOrigin
        });
      } catch {
      }
    }
  }
  if (!data) {
    const fontUrl = await globalThis.$fetch("/api/og-image-font", {
      query: { name, weight }
    });
    data = await globalThis.$fetch(fontUrl, {
      responseType: "arrayBuffer"
    });
  }
  cachedFonts[fontKey] = { name, weight: Number(weight), data, style: "normal" };
  await useStorage().setItem(storageKey, Buffer.from(data).toString("base64"));
  return cachedFonts[fontKey];
}
async function walkSatoriTree(node, plugins, props) {
  if (!node.props?.children)
    return;
  if (Array.isArray(node.props.children) && node.props.children.length === 0) {
    delete node.props.children;
    return;
  }
  for (const child of node.props.children || []) {
    if (child) {
      for (const plugin of plugins.flat()) {
        if (plugin.filter(child))
          await plugin.transform(child, props);
      }
      await walkSatoriTree(child, plugins, props);
    }
  }
}
function defineSatoriTransformer(transformer) {
  return transformer;
}

const imageSrc = defineSatoriTransformer({
  filter: (node) => node.type === "img",
  transform: async (node, options) => {
    const src = node.props?.src;
    if (src && src.startsWith("/")) {
      let updated = false;
      const file = await readPublicAssetBase64(src);
      let dimensions;
      if (file) {
        node.props.src = file.src;
        dimensions = { width: file.width, height: file.height };
        updated = true;
      }
      if (!updated) {
        let valid = true;
        const response = await globalThis.$fetch(src, {
          responseType: "arrayBuffer",
          baseURL: options.requestOrigin
        }).catch(() => {
          valid = false;
        });
        if (valid) {
          node.props.src = toBase64Image(src, response);
          const imageSize = await sizeOf(Buffer.from(response));
          dimensions = { width: imageSize.width, height: imageSize.height };
          updated = true;
        }
      }
      if (dimensions?.width && dimensions?.height) {
        const naturalAspectRatio = dimensions.width / dimensions.height;
        if (node.props.width && !node.props.height) {
          node.props.height = Math.round(node.props.width / naturalAspectRatio);
        } else if (node.props.height && !node.props.width) {
          node.props.width = Math.round(node.props.height * naturalAspectRatio);
        } else if (!node.props.width && !node.props.height) {
          node.props.width = dimensions.width;
          node.props.height = dimensions.height;
        }
      }
      if (!updated) {
        node.props.src = `${withBase(src, `${options.requestOrigin}`)}?${Date.now()}`;
      }
    }
  }
});

const twClasses = defineSatoriTransformer({
  filter: (node) => !!node.props?.class && !node.props?.tw,
  transform: async (node) => {
    node.props.tw = node.props.class;
  }
});

const flex = defineSatoriTransformer({
  filter: (node) => node.type === "div" && (Array.isArray(node.props?.children) && node.props?.children.length >= 1) && (!node.props.style?.display && !node.props?.class?.includes("hidden")),
  transform: async (node) => {
    node.props.style = node.props.style || {};
    node.props.style.display = "flex";
    if (!node.props?.class?.includes("flex-"))
      node.props.style.flexDirection = "column";
  }
});

function isEmojiFilter(node) {
  return node.type === "img" && node.props?.class?.includes("emoji");
}
const emojis = defineSatoriTransformer([
  // need to make sure parent div has flex for the emoji to render inline
  {
    filter: (node) => node.type === "div" && Array.isArray(node.props?.children) && node.props.children.some(isEmojiFilter),
    transform: async (node) => {
      node.props.style = node.props.style || {};
      node.props.style.display = "flex";
      node.props.style.alignItems = "center";
    }
  },
  {
    filter: isEmojiFilter,
    transform: async (node) => {
      node.props.style = node.props.style || {};
      node.props.style.height = "1em";
      node.props.style.width = "1em";
      node.props.style.margin = "0 .3em 0 .3em";
      node.props.style.verticalAlign = "0.1em";
      node.props.class = "";
    }
  }
]);

const encoding = defineSatoriTransformer({
  filter: (node) => typeof node.props?.children === "string",
  transform: async (node) => {
    node.props.children = decodeHtml(node.props.children);
  }
});

async function png(svg, options) {
  const resvgJS = new Resvg(svg, options);
  const pngData = resvgJS.render();
  return pngData.asPng();
}

function loadPngCreator() {
 return png
}

function satori$1(nodes, options) {
  return satori$2(nodes, options);
}

function loadSatori() {
  return satori$1
}

const satoriFonts = [];
let fontLoadPromise = null;
function loadFonts(baseURL, fonts) {
  if (fontLoadPromise)
    return fontLoadPromise;
  return fontLoadPromise = Promise.all(fonts.map((font) => loadFont(baseURL, font)));
}
const SatoriRenderer = {
  name: "satori",
  createPng: async function createPng(options) {
    const svg = await this.createSvg(options);
    const pngCreator = await loadPngCreator();
    return pngCreator(svg, options);
  },
  createVNode: async function createVNode(options) {
    const html$1 = await globalThis.$fetch("/api/og-image-html", {
      params: {
        path: options.path,
        options: JSON.stringify(options)
      }
    });
    const body = html$1.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] || "";
    const satoriTree = html(body);
    await walkSatoriTree(satoriTree, [
      emojis,
      twClasses,
      imageSrc,
      flex,
      encoding
    ], options);
    return satoriTree;
  },
  createSvg: async function createSvg(options) {
    const { fonts, satoriOptions } = useRuntimeConfig()["nuxt-og-image"];
    const vnodes = await this.createVNode(options);
    if (!satoriFonts.length)
      satoriFonts.push(...await loadFonts(options.requestOrigin, fonts));
    const satori = await loadSatori();
    return await satori(vnodes, {
      ...satoriOptions,
      fonts: satoriFonts,
      embedFont: true,
      width: options.width,
      height: options.height
    });
  }
};
const satori = SatoriRenderer;

async function useProvider(provider) {
  if (provider === 'satori')
    return satori
  if (provider === 'browser')
    return null
  return null
}

export { useProvider as u };
//# sourceMappingURL=provider.mjs.map
