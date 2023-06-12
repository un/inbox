import { useSSRContext, computed, defineComponent, ref, mergeProps, withCtx, createVNode, unref, isRef, createTextVNode, watch, toRef as toRef$1, readonly, customRef, getCurrentInstance, nextTick, watchEffect, createElementBlock, getCurrentScope, onScopeDispose, effectScope } from 'vue';
import { u as useAppConfig, f as useRoute, h as useSeoMeta, i as useToast, n as navigateTo, a as __nuxt_component_1$3, b as appConfig, d as classNames, e as useState, g as useRuntimeConfig, j as __nuxt_component_1$1, _ as _export_sfc } from '../server.mjs';
import { defu } from 'defu';
import { ssrRenderAttrs, ssrRenderComponent, ssrRenderStyle, ssrIncludeBooleanAttr, ssrRenderClass, ssrRenderAttr, ssrRenderSlot, ssrInterpolate } from 'vue/server-renderer';
import { d as defineOgImageScreenshot } from './defineOgImage-7646755d.mjs';
import { z } from 'zod';
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
import './ssr-6490d687.mjs';

function computedWithControl(source, fn) {
  let v = void 0;
  let track;
  let trigger;
  const dirty = ref(true);
  const update = () => {
    dirty.value = true;
    trigger();
  };
  watch(source, update, { flush: "sync" });
  const get = typeof fn === "function" ? fn : fn.get;
  const set = typeof fn === "function" ? void 0 : fn.set;
  const result = customRef((_track, _trigger) => {
    track = _track;
    trigger = _trigger;
    return {
      get() {
        if (dirty.value) {
          v = get();
          dirty.value = false;
        }
        track();
        return v;
      },
      set(v2) {
        set == null ? void 0 : set(v2);
      }
    };
  });
  if (Object.isExtensible(result))
    result.trigger = update;
  return result;
}
function tryOnScopeDispose(fn) {
  if (getCurrentScope()) {
    onScopeDispose(fn);
    return true;
  }
  return false;
}
function createSharedComposable(composable) {
  let subscribers = 0;
  let state;
  let scope;
  const dispose = () => {
    subscribers -= 1;
    if (scope && subscribers <= 0) {
      scope.stop();
      state = void 0;
      scope = void 0;
    }
  };
  return (...args) => {
    subscribers += 1;
    if (!state) {
      scope = effectScope(true);
      state = scope.run(() => composable(...args));
    }
    tryOnScopeDispose(dispose);
    return state;
  };
}
function toValue(r) {
  return typeof r === "function" ? r() : unref(r);
}
const noop = () => {
};
function toRef(...args) {
  if (args.length !== 1)
    return toRef$1(...args);
  const r = args[0];
  return typeof r === "function" ? readonly(customRef(() => ({ get: r, set: noop }))) : ref(r);
}
function tryOnMounted(fn, sync = true) {
  if (getCurrentInstance())
    ;
  else if (sync)
    fn();
  else
    nextTick(fn);
}
function unrefElement(elRef) {
  var _a;
  const plain = toValue(elRef);
  return (_a = plain == null ? void 0 : plain.$el) != null ? _a : plain;
}
const defaultWindow = void 0;
const defaultDocument = void 0;
function useEventListener(...args) {
  let target;
  let events;
  let listeners;
  let options;
  if (typeof args[0] === "string" || Array.isArray(args[0])) {
    [events, listeners, options] = args;
    target = defaultWindow;
  } else {
    [target, events, listeners, options] = args;
  }
  if (!target)
    return noop;
  if (!Array.isArray(events))
    events = [events];
  if (!Array.isArray(listeners))
    listeners = [listeners];
  const cleanups = [];
  const cleanup = () => {
    cleanups.forEach((fn) => fn());
    cleanups.length = 0;
  };
  const register = (el, event, listener, options2) => {
    el.addEventListener(event, listener, options2);
    return () => el.removeEventListener(event, listener, options2);
  };
  const stopWatch = watch(
    () => [unrefElement(target), toValue(options)],
    ([el, options2]) => {
      cleanup();
      if (!el)
        return;
      cleanups.push(
        ...events.flatMap((event) => {
          return listeners.map((listener) => register(el, event, listener, options2));
        })
      );
    },
    { immediate: true, flush: "post" }
  );
  const stop = () => {
    stopWatch();
    cleanup();
  };
  tryOnScopeDispose(stop);
  return stop;
}
function useActiveElement(options = {}) {
  var _a;
  const { window: window2 = defaultWindow } = options;
  const document = (_a = options.document) != null ? _a : window2 == null ? void 0 : window2.document;
  const activeElement = computedWithControl(
    () => null,
    () => document == null ? void 0 : document.activeElement
  );
  if (window2) {
    useEventListener(window2, "blur", (event) => {
      if (event.relatedTarget !== null)
        return;
      activeElement.trigger();
    }, true);
    useEventListener(window2, "focus", activeElement.trigger, true);
  }
  return activeElement;
}
function useMounted() {
  const isMounted = ref(false);
  if (getCurrentInstance())
    ;
  return isMounted;
}
function useSupported(callback) {
  const isMounted = useMounted();
  return computed(() => {
    isMounted.value;
    return Boolean(callback());
  });
}
function useMediaQuery(query, options = {}) {
  const { window: window2 = defaultWindow } = options;
  const isSupported = useSupported(() => window2 && "matchMedia" in window2 && "undefined".matchMedia === "function");
  let mediaQuery;
  const matches = ref(false);
  const cleanup = () => {
    if (!mediaQuery)
      return;
    if ("removeEventListener" in mediaQuery)
      mediaQuery.removeEventListener("change", update);
    else
      mediaQuery.removeListener(update);
  };
  const update = () => {
    if (!isSupported.value)
      return;
    cleanup();
    mediaQuery = window2.matchMedia(toRef(query).value);
    matches.value = !!(mediaQuery == null ? void 0 : mediaQuery.matches);
    if (!mediaQuery)
      return;
    if ("addEventListener" in mediaQuery)
      mediaQuery.addEventListener("change", update);
    else
      mediaQuery.addListener(update);
  };
  watchEffect(update);
  tryOnScopeDispose(() => cleanup());
  return matches;
}
var __getOwnPropSymbols$l = Object.getOwnPropertySymbols;
var __hasOwnProp$l = Object.prototype.hasOwnProperty;
var __propIsEnum$l = Object.prototype.propertyIsEnumerable;
var __objRest$3 = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp$l.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols$l)
    for (var prop of __getOwnPropSymbols$l(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum$l.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
function useMutationObserver(target, callback, options = {}) {
  const _a = options, { window: window2 = defaultWindow } = _a, mutationOptions = __objRest$3(_a, ["window"]);
  let observer;
  const isSupported = useSupported(() => window2 && "MutationObserver" in window2);
  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = void 0;
    }
  };
  const stopWatch = watch(
    () => unrefElement(target),
    (el) => {
      cleanup();
      if (isSupported.value && window2 && el) {
        observer = new MutationObserver(callback);
        observer.observe(el, mutationOptions);
      }
    },
    { immediate: true }
  );
  const stop = () => {
    cleanup();
    stopWatch();
  };
  tryOnScopeDispose(stop);
  return {
    isSupported,
    stop
  };
}
const BuiltinExtractors = {
  page: (event) => [event.pageX, event.pageY],
  client: (event) => [event.clientX, event.clientY],
  screen: (event) => [event.screenX, event.screenY],
  movement: (event) => event instanceof Touch ? null : [event.movementX, event.movementY]
};
function useMouse(options = {}) {
  const {
    type = "page",
    touch = true,
    resetOnTouchEnds = false,
    initialValue = { x: 0, y: 0 },
    window: window2 = defaultWindow,
    target = window2,
    eventFilter
  } = options;
  const x = ref(initialValue.x);
  const y = ref(initialValue.y);
  const sourceType = ref(null);
  const extractor = typeof type === "function" ? type : BuiltinExtractors[type];
  const mouseHandler = (event) => {
    const result = extractor(event);
    if (result) {
      [x.value, y.value] = result;
      sourceType.value = "mouse";
    }
  };
  const touchHandler = (event) => {
    if (event.touches.length > 0) {
      const result = extractor(event.touches[0]);
      if (result) {
        [x.value, y.value] = result;
        sourceType.value = "touch";
      }
    }
  };
  const reset = () => {
    x.value = initialValue.x;
    y.value = initialValue.y;
  };
  const mouseHandlerWrapper = eventFilter ? (event) => eventFilter(() => mouseHandler(event), {}) : (event) => mouseHandler(event);
  const touchHandlerWrapper = eventFilter ? (event) => eventFilter(() => touchHandler(event), {}) : (event) => touchHandler(event);
  if (target) {
    useEventListener(target, "mousemove", mouseHandlerWrapper, { passive: true });
    useEventListener(target, "dragover", mouseHandlerWrapper, { passive: true });
    if (touch && type !== "movement") {
      useEventListener(target, "touchstart", touchHandlerWrapper, { passive: true });
      useEventListener(target, "touchmove", touchHandlerWrapper, { passive: true });
      if (resetOnTouchEnds)
        useEventListener(target, "touchend", reset, { passive: true });
    }
  }
  return {
    x,
    y,
    sourceType
  };
}
function useTitle(newTitle = null, options = {}) {
  var _a, _b;
  const {
    document = defaultDocument
  } = options;
  const title = toRef((_a = newTitle != null ? newTitle : document == null ? void 0 : document.title) != null ? _a : null);
  const isReadonly = newTitle && typeof newTitle === "function";
  function format(t) {
    if (!("titleTemplate" in options))
      return t;
    const template = options.titleTemplate || "%s";
    return typeof template === "function" ? template(t) : toValue(template).replace(/%s/g, t);
  }
  watch(
    title,
    (t, o) => {
      if (t !== o && document)
        document.title = format(typeof t === "string" ? t : "");
    },
    { immediate: true }
  );
  if (options.observe && !options.titleTemplate && document && !isReadonly) {
    useMutationObserver(
      (_b = document.head) == null ? void 0 : _b.querySelector("title"),
      () => {
        if (document && document.title !== title.value)
          title.value = format(document.title);
      },
      { childList: true }
    );
  }
  return title;
}
function useWindowSize(options = {}) {
  const {
    window: window2 = defaultWindow,
    initialWidth = Infinity,
    initialHeight = Infinity,
    listenOrientation = true,
    includeScrollbar = true
  } = options;
  const width = ref(initialWidth);
  const height = ref(initialHeight);
  const update = () => {
    if (window2) {
      if (includeScrollbar) {
        width.value = window2.innerWidth;
        height.value = window2.innerHeight;
      } else {
        width.value = window2.document.documentElement.clientWidth;
        height.value = window2.document.documentElement.clientHeight;
      }
    }
  };
  update();
  tryOnMounted(update);
  useEventListener("resize", update, { passive: true });
  if (listenOrientation) {
    const matches = useMediaQuery("(orientation: portrait)");
    watch(matches, () => update());
  }
  return { width, height };
}
const __nuxt_component_0 = /* @__PURE__ */ defineComponent({
  name: "ClientOnly",
  inheritAttrs: false,
  // eslint-disable-next-line vue/require-prop-types
  props: ["fallback", "placeholder", "placeholderTag", "fallbackTag"],
  setup(_, { slots, attrs }) {
    const mounted = ref(false);
    return (props) => {
      var _a;
      if (mounted.value) {
        return (_a = slots.default) == null ? void 0 : _a.call(slots);
      }
      const slot = slots.fallback || slots.placeholder;
      if (slot) {
        return slot();
      }
      const fallbackStr = props.fallback || props.placeholder || "";
      const fallbackTag = props.fallbackTag || props.placeholderTag || "span";
      return createElementBlock(fallbackTag, attrs, fallbackStr);
    };
  }
});
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  components: {
    UIcon: __nuxt_component_1$3
  },
  props: {
    modelValue: {
      type: [String, Number],
      default: ""
    },
    type: {
      type: String,
      default: "text"
    },
    name: {
      type: String,
      default: null
    },
    placeholder: {
      type: String,
      default: null
    },
    required: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    readonly: {
      type: Boolean,
      default: false
    },
    autofocus: {
      type: Boolean,
      default: false
    },
    autocomplete: {
      type: String,
      default: null
    },
    spellcheck: {
      type: Boolean,
      default: null
    },
    icon: {
      type: String,
      default: null
    },
    loadingIcon: {
      type: String,
      default: () => appConfig.ui.input.default.loadingIcon
    },
    leadingIcon: {
      type: String,
      default: null
    },
    trailingIcon: {
      type: String,
      default: null
    },
    trailing: {
      type: Boolean,
      default: false
    },
    leading: {
      type: Boolean,
      default: false
    },
    loading: {
      type: Boolean,
      default: false
    },
    padded: {
      type: Boolean,
      default: true
    },
    size: {
      type: String,
      default: () => appConfig.ui.input.default.size,
      validator(value) {
        return Object.keys(appConfig.ui.input.size).includes(value);
      }
    },
    color: {
      type: String,
      default: () => appConfig.ui.input.default.color,
      validator(value) {
        return [...appConfig.ui.colors, ...Object.keys(appConfig.ui.input.color)].includes(value);
      }
    },
    variant: {
      type: String,
      default: () => appConfig.ui.input.default.variant,
      validator(value) {
        return [
          ...Object.keys(appConfig.ui.input.variant),
          ...Object.values(appConfig.ui.input.color).flatMap((value2) => Object.keys(value2))
        ].includes(value);
      }
    },
    ui: {
      type: Object,
      default: () => appConfig.ui.input
    }
  },
  emits: ["update:modelValue", "focus", "blur"],
  setup(props, { emit, slots }) {
    const appConfig2 = useAppConfig();
    const ui = computed(() => defu({}, props.ui, appConfig2.ui.input));
    const input = ref(null);
    const onInput = (event) => {
      emit("update:modelValue", event.target.value);
    };
    const inputClass = computed(() => {
      var _a, _b;
      const variant = ((_b = (_a = ui.value.color) == null ? void 0 : _a[props.color]) == null ? void 0 : _b[props.variant]) || ui.value.variant[props.variant];
      return classNames(
        ui.value.base,
        ui.value.rounded,
        ui.value.placeholder,
        ui.value.size[props.size],
        props.padded ? ui.value.padding[props.size] : "p-0",
        variant == null ? void 0 : variant.replaceAll("{color}", props.color),
        (isLeading.value || slots.leading) && ui.value.leading.padding[props.size],
        (isTrailing.value || slots.trailing) && ui.value.trailing.padding[props.size],
        ui.value.custom
      );
    });
    const isLeading = computed(() => {
      return props.icon && props.leading || props.icon && !props.trailing || props.loading && !props.trailing || props.leadingIcon;
    });
    const isTrailing = computed(() => {
      return props.icon && props.trailing || props.loading && props.trailing || props.trailingIcon;
    });
    const leadingIconName = computed(() => {
      if (props.loading) {
        return props.loadingIcon;
      }
      return props.leadingIcon || props.icon;
    });
    const trailingIconName = computed(() => {
      if (props.loading && !isLeading.value) {
        return props.loadingIcon;
      }
      return props.trailingIcon || props.icon;
    });
    const leadingWrapperIconClass = computed(() => {
      return classNames(
        ui.value.icon.leading.wrapper,
        ui.value.icon.leading.pointer,
        ui.value.icon.leading.padding[props.size]
      );
    });
    const leadingIconClass = computed(() => {
      return classNames(
        ui.value.icon.base,
        appConfig2.ui.colors.includes(props.color) && ui.value.icon.color.replaceAll("{color}", props.color),
        ui.value.icon.size[props.size],
        props.loading && "animate-spin"
      );
    });
    const trailingWrapperIconClass = computed(() => {
      return classNames(
        ui.value.icon.trailing.wrapper,
        ui.value.icon.trailing.pointer,
        ui.value.icon.trailing.padding[props.size]
      );
    });
    const trailingIconClass = computed(() => {
      return classNames(
        ui.value.icon.base,
        appConfig2.ui.colors.includes(props.color) && ui.value.icon.color.replaceAll("{color}", props.color),
        ui.value.icon.size[props.size],
        props.loading && !isLeading.value && "animate-spin"
      );
    });
    return {
      // eslint-disable-next-line vue/no-dupe-keys
      ui,
      input,
      isLeading,
      isTrailing,
      inputClass,
      leadingIconName,
      leadingIconClass,
      leadingWrapperIconClass,
      trailingIconName,
      trailingIconClass,
      trailingWrapperIconClass,
      onInput
    };
  }
});
function _sfc_ssrRender$1(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  const _component_UIcon = __nuxt_component_1$3;
  _push(`<div${ssrRenderAttrs(mergeProps({
    class: _ctx.ui.wrapper
  }, _attrs))}><input${ssrRenderAttr("id", _ctx.name)}${ssrRenderAttr("name", _ctx.name)}${ssrRenderAttr("value", _ctx.modelValue)}${ssrRenderAttr("type", _ctx.type)}${ssrIncludeBooleanAttr(_ctx.required) ? " required" : ""}${ssrRenderAttr("placeholder", _ctx.placeholder)}${ssrIncludeBooleanAttr(_ctx.disabled || _ctx.loading) ? " disabled" : ""}${ssrIncludeBooleanAttr("readonly" in _ctx ? _ctx.readonly : unref(readonly)) ? " readonly" : ""}${ssrRenderAttr("autocomplete", _ctx.autocomplete)}${ssrRenderAttr("spellcheck", _ctx.spellcheck)} class="${ssrRenderClass([_ctx.inputClass, "form-input"])}">`);
  ssrRenderSlot(_ctx.$slots, "default", {}, null, _push, _parent);
  if (_ctx.isLeading && _ctx.leadingIconName || _ctx.$slots.leading) {
    _push(`<span class="${ssrRenderClass(_ctx.leadingWrapperIconClass)}">`);
    ssrRenderSlot(_ctx.$slots, "leading", {
      disabled: _ctx.disabled,
      loading: _ctx.loading
    }, () => {
      _push(ssrRenderComponent(_component_UIcon, {
        name: _ctx.leadingIconName,
        class: _ctx.leadingIconClass
      }, null, _parent));
    }, _push, _parent);
    _push(`</span>`);
  } else {
    _push(`<!---->`);
  }
  if (_ctx.isTrailing && _ctx.trailingIconName || _ctx.$slots.trailing) {
    _push(`<span class="${ssrRenderClass(_ctx.trailingWrapperIconClass)}">`);
    ssrRenderSlot(_ctx.$slots, "trailing", {
      disabled: _ctx.disabled,
      loading: _ctx.loading
    }, () => {
      _push(ssrRenderComponent(_component_UIcon, {
        name: _ctx.trailingIconName,
        class: _ctx.trailingIconClass
      }, null, _parent));
    }, _push, _parent);
    _push(`</span>`);
  } else {
    _push(`<!---->`);
  }
  _push(`</div>`);
}
const _sfc_setup$2 = _sfc_main$2.setup;
_sfc_main$2.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/.pnpm/@nuxthq+ui-edge@2.3.0-28109578.cbc8ef1_vue@3.3.4_webpack@5.86.0/node_modules/@nuxthq/ui-edge/dist/runtime/components/forms/Input.vue");
  return _sfc_setup$2 ? _sfc_setup$2(props, ctx) : void 0;
};
const __nuxt_component_2 = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["ssrRender", _sfc_ssrRender$1]]);
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  props: {
    size: {
      type: String,
      default: () => appConfig.ui.badge.default.size,
      validator(value) {
        return Object.keys(appConfig.ui.badge.size).includes(value);
      }
    },
    color: {
      type: String,
      default: () => appConfig.ui.badge.default.color,
      validator(value) {
        return [...appConfig.ui.colors, ...Object.keys(appConfig.ui.badge.color)].includes(value);
      }
    },
    variant: {
      type: String,
      default: () => appConfig.ui.badge.default.variant,
      validator(value) {
        return [
          ...Object.keys(appConfig.ui.badge.variant),
          ...Object.values(appConfig.ui.badge.color).flatMap((value2) => Object.keys(value2))
        ].includes(value);
      }
    },
    label: {
      type: String,
      default: null
    },
    ui: {
      type: Object,
      default: () => appConfig.ui.badge
    }
  },
  setup(props) {
    const appConfig2 = useAppConfig();
    const ui = computed(() => defu({}, props.ui, appConfig2.ui.badge));
    const badgeClass = computed(() => {
      var _a, _b;
      const variant = ((_b = (_a = ui.value.color) == null ? void 0 : _a[props.color]) == null ? void 0 : _b[props.variant]) || ui.value.variant[props.variant];
      return classNames(
        ui.value.base,
        ui.value.font,
        ui.value.rounded,
        ui.value.size[props.size],
        variant == null ? void 0 : variant.replaceAll("{color}", props.color)
      );
    });
    return {
      badgeClass
    };
  }
});
function _sfc_ssrRender(_ctx, _push, _parent, _attrs, $props, $setup, $data, $options) {
  _push(`<span${ssrRenderAttrs(mergeProps({ class: _ctx.badgeClass }, _attrs))}>`);
  ssrRenderSlot(_ctx.$slots, "default", {}, () => {
    _push(`${ssrInterpolate(_ctx.label)}`);
  }, _push, _parent);
  _push(`</span>`);
}
const _sfc_setup$1 = _sfc_main$1.setup;
_sfc_main$1.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("../../node_modules/.pnpm/@nuxthq+ui-edge@2.3.0-28109578.cbc8ef1_vue@3.3.4_webpack@5.86.0/node_modules/@nuxthq/ui-edge/dist/runtime/components/elements/Badge.vue");
  return _sfc_setup$1 ? _sfc_setup$1(props, ctx) : void 0;
};
const __nuxt_component_3 = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["ssrRender", _sfc_ssrRender]]);
const useColorMode = () => {
  return useState("color-mode").value;
};
function logicAnd(...args) {
  return computed(() => args.every((i) => toValue(i)));
}
function logicNot(v) {
  return computed(() => !toValue(v));
}
const _useShortcuts = () => {
  const macOS = computed(() => false);
  const metaSymbol = ref(" ");
  const activeElement = useActiveElement();
  const usingInput = computed(() => {
    var _a, _b, _c, _d;
    const usingInput2 = !!(((_a = activeElement.value) == null ? void 0 : _a.tagName) === "INPUT" || ((_b = activeElement.value) == null ? void 0 : _b.tagName) === "TEXTAREA" || ((_c = activeElement.value) == null ? void 0 : _c.contentEditable) === "true");
    if (usingInput2) {
      return ((_d = activeElement.value) == null ? void 0 : _d.name) || true;
    }
    return false;
  });
  return {
    macOS,
    metaSymbol,
    activeElement,
    usingInput
  };
};
const useShortcuts = createSharedComposable(_useShortcuts);
const defineShortcuts = (config) => {
  const { macOS, usingInput } = useShortcuts();
  let shortcuts = [];
  const onKeyDown = (e) => {
    if (!e.key) {
      return;
    }
    const alphabeticalKey = /^[a-z]{1}$/i.test(e.key);
    for (const shortcut of shortcuts) {
      if (e.key.toLowerCase() !== shortcut.key) {
        continue;
      }
      if (e.metaKey !== shortcut.metaKey) {
        continue;
      }
      if (e.ctrlKey !== shortcut.ctrlKey) {
        continue;
      }
      if (alphabeticalKey && e.shiftKey !== shortcut.shiftKey) {
        continue;
      }
      if (shortcut.condition.value) {
        e.preventDefault();
        shortcut.handler();
      }
      return;
    }
  };
  shortcuts = Object.entries(config).map(([key, shortcutConfig]) => {
    if (!shortcutConfig) {
      return null;
    }
    const keySplit = key.toLowerCase().split("_").map((k) => k);
    let shortcut = {
      key: keySplit.filter((k) => !["meta", "ctrl", "shift", "alt"].includes(k)).join("_"),
      metaKey: keySplit.includes("meta"),
      ctrlKey: keySplit.includes("ctrl"),
      shiftKey: keySplit.includes("shift"),
      altKey: keySplit.includes("alt")
    };
    if (!macOS.value && shortcut.metaKey && !shortcut.ctrlKey) {
      shortcut.metaKey = false;
      shortcut.ctrlKey = true;
    }
    if (typeof shortcutConfig === "function") {
      shortcut.handler = shortcutConfig;
    } else if (typeof shortcutConfig === "object") {
      shortcut = { ...shortcut, handler: shortcutConfig.handler };
    }
    if (!shortcut.handler) {
      console.trace("[Shortcut] Invalid value");
      return null;
    }
    const conditions = [];
    if (!shortcutConfig.usingInput) {
      conditions.push(logicNot(usingInput));
    } else if (typeof shortcutConfig.usingInput === "string") {
      conditions.push(computed(() => usingInput.value === shortcutConfig.usingInput));
    }
    shortcut.condition = logicAnd(...conditions, ...shortcutConfig.whenever || []);
    return shortcut;
  }).filter(Boolean);
  useEventListener("keydown", onKeyDown);
};
function isValidString(str) {
  return typeof str === "string" && str.trim() !== "";
}
const umConfig = computed(() => {
  const { public: { umamiHost, umamiId } } = /* @__PURE__ */ useRuntimeConfig();
  const {
    umami: {
      host = "",
      id = "",
      domains = void 0,
      ignoreDnt = true,
      ignoreLocalhost: ignoreLocal = false,
      autoTrack = true,
      customEndpoint: _customEP = void 0,
      version = 1
    } = {}
  } = useAppConfig();
  const customEP = isValidString(_customEP) ? _customEP.trim() : void 0;
  const customEndpoint = customEP && customEP !== "/" ? customEP.startsWith("/") ? _customEP : `/${_customEP}` : void 0;
  return {
    host: umamiHost || host,
    id: umamiId || id,
    domains,
    ignoreDnt,
    ignoreLocal,
    autoTrack,
    customEndpoint,
    version
  };
});
computed(() => {
  const domains = umConfig.value.domains;
  return Array.isArray(domains) && domains.length ? domains : isValidString(domains) ? domains.split(",").map((d) => d.trim()) : void 0;
});
const endpoint = computed(() => {
  const { host, customEndpoint, version } = umConfig.value;
  const { host: urlHost, protocol } = new URL(host);
  const _v = urlHost === "analytics.umami.is" ? 2 : version;
  const branch = customEndpoint || (_v === 2 ? "/api/send" : "/api/collect");
  return `${protocol}//${urlHost}${branch}`;
});
const preflight = computed(() => {
  {
    return "ssr";
  }
});
const getPayload = computed(() => {
  const {
    location: { hostname },
    screen: { width, height },
    navigator: { language },
    document: { referrer, title }
  } = window;
  const pageTitle = useTitle();
  const { fullPath: pageUrl } = useRoute();
  const payload = {
    screen: `${width}x${height}`,
    language,
    hostname,
    url: pageUrl,
    referrer,
    title: pageTitle.value || title
  };
  return {
    payload,
    pageReferrer: referrer,
    pageUrl
  };
});
async function collect(load) {
  fetch(endpoint.value, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(load)
  }).then((res) => {
    if (res && !res.ok) ;
  }).catch((err) => {
  });
}
function trackEvent(eventName, eventData) {
  const check = preflight.value;
  if (check === "ssr") {
    return;
  }
  if (check !== true) {
    return;
  }
  const { id: website, version } = umConfig.value;
  const { payload } = getPayload.value;
  const name = isValidString(eventName) ? eventName : "#unknown-event";
  const data = eventData !== null && typeof eventData === "object" ? eventData : void 0;
  const eventObj = version === 2 ? {
    name,
    data
  } : {
    event_name: name,
    event_data: data
  };
  void collect({
    type: "event",
    payload: {
      ...payload,
      ...eventObj,
      website
    }
  });
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  __ssrInlineRender: true,
  setup(__props) {
    useSeoMeta({
      title: "UnInbox",
      description: "Open Source Email + Chat communication platform"
    });
    defineOgImageScreenshot();
    const { x, y } = useMouse();
    const { width, height } = useWindowSize();
    const dx = computed(() => Math.abs(x.value - width.value / 2));
    const dy = computed(() => Math.abs(y.value - height.value / 2));
    const distance = computed(() => Math.sqrt(dx.value * dx.value + dy.value * dy.value));
    const size = computed(() => Math.max(400 - distance.value / 2, 150));
    const opacity = computed(() => Math.min(Math.max(size.value / 300, 0.7), 1));
    const logo = ref();
    computed(() => {
      var _a2, _b;
      var _a;
      let rect = (_a = logo.value) == null ? void 0 : _a.getBoundingClientRect();
      const xPos = x.value - ((_a2 = rect == null ? void 0 : rect.left) != null ? _a2 : 0);
      const yPos = y.value - ((_b = rect == null ? void 0 : rect.top) != null ? _b : 0);
      return `radial-gradient(circle at ${xPos}px ${yPos}px, black 30%, transparent 100%)`;
    });
    const email = ref("");
    const showConfirmation = ref(false);
    const invalidEmail = ref(false);
    const submitError = ref(false);
    const colorMode = useColorMode();
    computed({
      get() {
        return colorMode.value === "dark";
      },
      set() {
        colorMode.preference = colorMode.value === "dark" ? "light" : "dark";
      }
    });
    const toast = useToast();
    defineShortcuts({
      enter: {
        usingInput: "emailInput",
        handler: () => {
          registerWaitlist();
        }
      }
    });
    async function registerWaitlist() {
      trackEvent("Signup");
      const parsedEmail = z.string().email().safeParse(email.value);
      if (!parsedEmail.success) {
        invalidEmail.value = true;
        return;
      }
      invalidEmail.value = false;
      const res = await $fetch("/api/waitlist", {
        method: "POST",
        body: JSON.stringify({ email: email.value }),
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (res.error) {
        console.error(res.error);
        toast.add({
          title: "Something went wrong \u{1F41B}",
          description: "Please email us help@uninbox.com or reach out above",
          color: "red",
          timeout: 9e4
        });
        submitError.value = true;
        showConfirmation.value = true;
      }
      if (res.success) {
        toast.add({
          title: "You're on the waitlist! \u{1F389}",
          description: "Please check your email for confirmation, it should already be there \u{1F440}",
          color: "green",
          timeout: 6e4
        });
        showConfirmation.value = true;
      }
    }
    return (_ctx, _push, _parent, _attrs) => {
      const _component_ClientOnly = __nuxt_component_0;
      const _component_UButton = __nuxt_component_1$1;
      const _component_UInput = __nuxt_component_2;
      const _component_UBadge = __nuxt_component_3;
      const _component_UIcon = __nuxt_component_1$3;
      _push(`<div${ssrRenderAttrs(mergeProps({ class: "w-screen h-screen bg-gradient-to-b from-black/5 to-sky-500/30 from-80% flex flex-col items-center justify-center relative overflow-hidden" }, _attrs))}>`);
      _push(ssrRenderComponent(_component_ClientOnly, null, {
        fallback: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`<div class="w-8 h-8"${_scopeId}></div>`);
          } else {
            return [
              createVNode("div", { class: "w-8 h-8" })
            ];
          }
        })
      }, _parent));
      _push(`<div class="absolute bg-sky-500/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none blur-3xl" style="${ssrRenderStyle({
        opacity: unref(opacity),
        left: `${unref(x)}px`,
        top: `${unref(y)}px`,
        width: `${unref(size)}px`,
        height: `${unref(size)}px`
      })}"></div><div class="h-screen w-full flex flex-col items-center justify-center gap-8 z-10 overflow-auto"><h1 class="font-display text-9xl glow mt-24">UnInbox</h1><div class="flex flex-col gap-2 items-center"><h2 class="text-lg">Open Source <b>Email</b> + <b>Chat</b> communication platform</h2><h3 class="text italic">hey.com &amp; front.com alternative</h3></div><div class="flex gap-4 transition-all duration-600 cursor-none"${ssrIncludeBooleanAttr(unref(showConfirmation)) ? " disabled" : ""}>`);
      _push(ssrRenderComponent(_component_UInput, {
        modelValue: unref(email),
        "onUpdate:modelValue": ($event) => isRef(email) ? email.value = $event : null,
        icon: "i-mdi-email-outline",
        type: "email",
        required: true,
        placeholder: "hello@email.com",
        disabled: unref(showConfirmation),
        name: "emailInput"
      }, null, _parent));
      _push(ssrRenderComponent(_component_UButton, {
        onClick: ($event) => registerWaitlist(),
        disabled: unref(showConfirmation)
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(`Join Waitlist`);
          } else {
            return [
              createTextVNode("Join Waitlist")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div>`);
      if (unref(invalidEmail)) {
        _push(ssrRenderComponent(_component_UBadge, {
          color: "red",
          variant: "solid"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`Invalid email address`);
            } else {
              return [
                createTextVNode("Invalid email address")
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<!---->`);
      }
      if (unref(submitError)) {
        _push(ssrRenderComponent(_component_UBadge, {
          color: "red",
          variant: "solid"
        }, {
          default: withCtx((_, _push2, _parent2, _scopeId) => {
            if (_push2) {
              _push2(`Something went wrong, please contact us`);
            } else {
              return [
                createTextVNode("Something went wrong, please contact us")
              ];
            }
          }),
          _: 1
        }, _parent));
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="${ssrRenderClass([!unref(showConfirmation) ? "opacity-0 hidden" : "opacity-100 visible", "flex flex-col gap-4 items-center border-t-2 border-gray-400 pt-6 transition-all duration-1000"])}">`);
      if (!unref(submitError)) {
        _push(`<p class="font-display text-2xl">Nice email!</p>`);
      } else {
        _push(`<!---->`);
      }
      if (!unref(submitError)) {
        _push(`<p> We&#39;ve sent you a confirmation. In the mean time, heres how you can follow the progress. </p>`);
      } else {
        _push(`<!---->`);
      }
      _push(`<div class="flex gap-4"><div class="border-2 p-8 rounded-md border-gray-600 flex flex-col items-center gap-4 bg-blue-500/10 hover:border-gray-400 transition-colors cursor-pointer">`);
      _push(ssrRenderComponent(_component_UIcon, {
        name: "i-mdi-twitter\n",
        class: "text-4xl"
      }, null, _parent));
      _push(`<p>Follow on Twitter</p></div><div class="border-2 p-8 rounded-md border-gray-600 flex flex-col items-center gap-4 bg-blue-500/10 hover:border-gray-400 transition-colors cursor-pointer">`);
      _push(ssrRenderComponent(_component_UIcon, {
        name: "i-mdi-discord\n",
        class: "text-4xl"
      }, null, _parent));
      _push(`Join on Discord </div><div class="border-2 p-8 rounded-md border-gray-600 flex flex-col items-center gap-4 bg-blue-500/10 hover:border-gray-400 transition-colors cursor-pointer">`);
      _push(ssrRenderComponent(_component_UIcon, {
        name: "i-mdi-github\n",
        class: "text-4xl"
      }, null, _parent));
      _push(`Star on GitHub </div><div class="border-2 p-8 rounded-md border-gray-600 flex flex-col items-center gap-4 bg-blue-500/10 hover:border-gray-400 transition-colors cursor-pointer"><p class="font-display text-3xl">Cal</p> Call on Cal.com </div></div>`);
      _push(ssrRenderComponent(_component_UBadge, {
        color: "blue",
        variant: "solid",
        size: "lg",
        class: "cursor-pointer",
        onClick: ($event) => ("navigateTo" in _ctx ? _ctx.navigateTo : unref(navigateTo))("/oss-friends", { external: true })
      }, {
        default: withCtx((_, _push2, _parent2, _scopeId) => {
          if (_push2) {
            _push2(` Check out our Open Source Friends. Life is better with friends, but even better open source! `);
          } else {
            return [
              createTextVNode(" Check out our Open Source Friends. Life is better with friends, but even better open source! ")
            ];
          }
        }),
        _: 1
      }, _parent));
      _push(`</div></div></div>`);
    };
  }
});
const _sfc_setup = _sfc_main.setup;
_sfc_main.setup = (props, ctx) => {
  const ssrContext = useSSRContext();
  (ssrContext.modules || (ssrContext.modules = /* @__PURE__ */ new Set())).add("pages/index.vue");
  return _sfc_setup ? _sfc_setup(props, ctx) : void 0;
};

export { _sfc_main as default };
//# sourceMappingURL=index-f377751d.mjs.map
