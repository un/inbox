import { defineComponent, computed, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrInterpolate } from 'vue/server-renderer';

const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    inheritAttrs: false
  },
  __name: "OgImageBasic.island",
  __ssrInlineRender: true,
  props: {
    path: String,
    title: {
      type: String,
      default: "Og Image Template"
    },
    description: {
      type: String,
      default: "Set a description to change me."
    },
    background: {
      type: String,
      default: "linear-gradient(to bottom, #dbf4ff, #fff1f1)"
    },
    color: {
      type: String
    },
    padding: {
      type: String,
      default: "0 100px"
    },
    titleFontSize: {
      type: String,
      default: "60px"
    },
    descriptionFontSize: {
      type: String,
      default: "26px"
    }
  },
  setup(__props) {
    const props = __props;
    const containerAttrs = computed(() => {
      var _a, _b;
      const isBackgroundTw = (_a = props.background) == null ? void 0 : _a.startsWith("bg-");
      const isColorTw = (_b = props.color) == null ? void 0 : _b.startsWith("text-");
      const classes = [
        "w-full",
        "h-full",
        "flex",
        "items-center",
        "justify-center"
      ];
      const styles = {
        padding: props.padding
      };
      if (isBackgroundTw)
        classes.push(props.background);
      else if (props.background)
        styles.background = props.background;
      if (isColorTw)
        classes.push(props.color);
      else
        styles.color = props.color;
      return { class: classes, style: styles };
    });
    const titleAttrs = computed(() => {
      const classes = [];
      const styles = {
        fontWeight: "bold",
        marginBottom: "20px",
        fontSize: props.titleFontSize
      };
      return { class: classes, style: styles };
    });
    const descriptionAttrs = computed(() => {
      const classes = [];
      const styles = {
        fontSize: props.descriptionFontSize
      };
      return { class: classes, style: styles };
    });
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps(containerAttrs.value, _attrs))}><div class="flex flex-col w-full"><div${ssrRenderAttrs(titleAttrs.value)}>${ssrInterpolate(__props.title || "Null Title")}</div>`);
      if (__props.description) {
        _push(`<div${ssrRenderAttrs(descriptionAttrs.value)}>${ssrInterpolate(__props.description)}</div>`);
      } else {
        _push(`<!---->`);
      }
      _push(`</div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/.pnpm/nuxt-og-image@2.0.0-beta.58_vue@3.3.4/node_modules/nuxt-og-image/dist/runtime/components/OgImageBasic.island.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=OgImageBasic.island-622045db.mjs.map
