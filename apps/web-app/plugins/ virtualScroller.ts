import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import {
  DynamicScroller,
  DynamicScrollerItem,
  RecycleScroller
} from 'vue-virtual-scroller';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('RecycleScroller', RecycleScroller);
  nuxtApp.vueApp.component('DynamicScroller', DynamicScroller);
  nuxtApp.vueApp.component('DynamicScrollerItem', DynamicScrollerItem);
});
