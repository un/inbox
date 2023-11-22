<script setup>
  const options = ref([
    // { id: 1, name: 'bug', color: 'd73a4a' },
    // { id: 2, name: 'documentation', color: '0075ca' },
    // { id: 3, name: 'duplicate', color: 'cfd3d7' },
    // { id: 4, name: 'enhancement', color: 'a2eeef' },
    // { id: 5, name: 'good first issue', color: '7057ff' },
    // { id: 6, name: 'help wanted', color: '008672' },
    // { id: 7, name: 'invalid', color: 'e4e669' },
    // { id: 8, name: 'question', color: 'd876e3' },
    // { id: 9, name: 'wontfix', color: 'ffffff' }
  ]);

  const selected = ref([]);

  const labels = computed({
    get: () => selected.value,
    set: async (labels) => {
      const promises = labels.map(async (label) => {
        if (label.id) {
          return label;
        }

        // In a real app, you would make an API call to create the label
        const response = {
          id: options.value.length + 1,
          email: label.email
        };

        options.value.push(response);

        const inputElement = document.querySelector('input[name="q"]');
        if (inputElement) {
          inputElement.value = '';
        }
        return response;
      });

      selected.value = await Promise.all(promises);
    }
  });
</script>

<template>
  <div class="max-w-72 w-72">
    {{ selected }}
    <NuxtUiSelectMenu
      v-model="labels"
      :options="options"
      by="id"
      name="email"
      option-attribute="email"
      multiple
      searchable
      creatable
      :clear-search-on-close="true">
      <template #label>
        <template v-if="labels.length">
          <span class="flex flex-row flex-wrap gap-1">
            <span
              v-for="label of labels"
              :key="label.id">
              {{ label.email }}
            </span>
          </span>
        </template>
        <template v-else>
          <span class="text-gray-500 dark:text-gray-400 truncate"
            >Select emails</span
          >
        </template>
      </template>
      <template #option="{ option }">
        <span class="truncate">{{ option.email }}</span>
      </template>
      <template #option-create="{ option }">
        <span class="flex-shrink-0">New Email:</span>
        <span class="block truncate">{{ option.email }}</span>
      </template>
    </NuxtUiSelectMenu>
  </div>
</template>
