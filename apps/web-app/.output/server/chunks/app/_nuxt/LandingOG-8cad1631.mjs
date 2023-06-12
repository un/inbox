import { defineComponent, mergeProps, useSSRContext } from 'vue';
import { ssrRenderAttrs, ssrRenderStyle, ssrInterpolate } from 'vue/server-renderer';

const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    inheritAttrs: false
  },
  __name: "LandingOG",
  __ssrInlineRender: true,
  props: {
    description: String,
    sub: String,
    cta: String
  },
  setup(__props) {
    return (_ctx, _push, _parent, _attrs) => {
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "w-full h-full flex flex-col text-white bg-zinc-900 items-center justify-center" }, _attrs))}><h1 class="m-0 text-9xl" style="${ssrRenderStyle({ fontFamily: "CalSans" })}">UnInbox</h1><p class="text-5xl" style="${ssrRenderStyle({ fontFamily: "Inter" })}">${ssrInterpolate(__props.description)}</p><p class="text-4xl italic" style="${ssrRenderStyle({ fontFamily: "Inter" })}">${ssrInterpolate(__props.sub)}</p></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("components/islands/LandingOG.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=LandingOG-8cad1631.mjs.map
