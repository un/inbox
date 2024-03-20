import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import {
  DynamicScroller,
  DynamicScrollerItem,
  RecycleScroller
} from 'vue-virtual-scroller';
import { defineNuxtPlugin } from '#imports';

export default defineNuxtPlugin((nuxtApp) => {
  // @ts-expect-error - VueVirtualScroller is not typed
  nuxtApp.vueApp.component('RecycleScroller', RecycleScroller);
  // @ts-expect-error - VueVirtualScroller is not typed
  nuxtApp.vueApp.component('DynamicScroller', DynamicScroller);
  // @ts-expect-error - VueVirtualScroller is not typed
  nuxtApp.vueApp.component('DynamicScrollerItem', DynamicScrollerItem);
});
