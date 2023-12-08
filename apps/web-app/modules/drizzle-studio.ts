import { defineNuxtModule } from 'nuxt/kit';
import { addCustomTab } from '@nuxt/devtools-kit';

export default defineNuxtModule({
  meta: {
    name: 'drizzle-studio'
  },
  setup() {
    addCustomTab({
      name: 'dizzle-studio',
      title: 'Drizzle Studio',
      icon: 'simple-icons:drizzle',
      view: {
        type: 'iframe',
        src: 'https://local.drizzle.studio'
      }
    });
  }
});
