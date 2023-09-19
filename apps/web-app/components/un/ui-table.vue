<script lang="ts">
  //* This is fork of the original NuxtUI table component - see ui.nuxt.com for the original

  //   import { ref, computed, defineComponent, toRaw } from 'vue';
  //   import type { PropType } from 'vue';
  import { defu } from 'defu';

  function omit<T extends object, K extends keyof T>(
    object: T,
    keys: K[]
  ): Omit<T, K> {
    const result = {} as Omit<T, K>;
    for (const key in object) {
      if (!keys.includes(key as unknown as K)) {
        // @ts-ignore
        result[key] = object[key];
      }
    }
    return result;
  }

  function get<T, K extends keyof T>(
    object: T,
    path: string,
    defaultValue?: any
  ): any {
    const keys = path.split('.');
    let result: any = object;
    for (const key of keys) {
      if (result && key in result) {
        result = result[key];
      } else {
        return defaultValue;
      }
    }
    return result;
  }

  function upperFirst(str: string): string {
    if (str.length === 0) {
      return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // const appConfig = useAppConfig()

  function defaultComparator<T>(a: T, z: T): boolean {
    return a === z;
  }

  export default defineComponent({
    inheritAttrs: false,
    props: {
      modelValue: {
        type: Array,
        default: null
      },
      by: {
        type: [String, Function],
        default: () => defaultComparator
      },
      rows: {
        type: Array as PropType<{ [key: string]: any; click?: Function }[]>,
        default: () => []
      },
      columns: {
        type: Array as PropType<
          {
            key: string;
            sortable?: boolean;
            direction?: 'asc' | 'desc';
            class?: string;
            [key: string]: any;
          }[]
        >,
        default: null
      },
      columnAttribute: {
        type: String,
        default: 'label'
      },
      sort: {
        type: Object as PropType<{ column: string; direction: 'asc' | 'desc' }>,
        default: () => ({})
      },
      loading: {
        type: Boolean,
        default: false
      }
      // emptyState: {
      //   type: Object as PropType<{ icon: string, label: string }>,
      //   default: () => appConfig.ui.table.default.emptyState
      // },
    },
    emits: ['update:modelValue'],
    setup(props, { emit, attrs }) {
      const columns = computed(
        () =>
          props.columns ??
          Object.keys(omit(props.rows[0] ?? {}, ['click'])).map((key) => ({
            key,
            label: upperFirst(key),
            sortable: false
          }))
      );

      const sort = ref(
        defu({}, props.sort, { column: null, direction: 'asc' })
      );

      const rows = computed(() => {
        if (!sort.value?.column) {
          return props.rows;
        }

        const { column, direction } = sort.value;

        return props.rows.slice().sort((a, b) => {
          const aValue = a[column];
          const bValue = b[column];

          if (aValue === bValue) {
            return 0;
          }

          if (direction === 'asc') {
            return aValue < bValue ? -1 : 1;
          } else {
            return aValue > bValue ? -1 : 1;
          }
        });
      });

      const selected = computed({
        get() {
          return props.modelValue;
        },
        set(value) {
          emit('update:modelValue', value);
        }
      });

      const indeterminate = computed(
        () =>
          selected.value &&
          selected.value.length > 0 &&
          selected.value.length < props.rows.length
      );

      function compare(a: any, z: any) {
        if (typeof props.by === 'string') {
          const property = props.by as unknown as any;
          return a?.[property] === z?.[property];
        }
        return props.by(a, z);
      }

      function isSelected(row: any) {
        if (!props.modelValue) {
          return false;
        }

        return selected.value.some((item) => compare(toRaw(item), toRaw(row)));
      }

      function onSort(column: { key: string; direction?: 'asc' | 'desc' }) {
        if (sort.value.column === column.key) {
          const direction =
            !column.direction || column.direction === 'asc' ? 'desc' : 'asc';

          if (sort.value.direction === direction) {
            sort.value = defu({}, props.sort, {
              column: null,
              direction: 'asc'
            });
          } else {
            sort.value.direction =
              sort.value.direction === 'asc' ? 'desc' : 'asc';
          }
        } else {
          sort.value = {
            column: column.key,
            direction: column.direction || 'asc'
          };
        }
      }

      function onSelect(row: any) {
        if (!attrs.onSelect) {
          return;
        }

        // @ts-ignore
        attrs.onSelect(row);
      }

      function selectAllRows() {
        props.rows.forEach((row) => {
          // If the row is already selected, don't select it again
          if (selected.value.some((item) => compare(toRaw(item), toRaw(row)))) {
            return;
          }

          // @ts-ignore
          attrs.onSelect ? attrs.onSelect(row) : selected.value.push(row);
        });
      }

      function onChange(event: any) {
        if (event.target.checked) {
          selectAllRows();
        } else {
          selected.value = [];
        }
      }

      function getRowData(
        row: Object,
        rowKey: string | string[],
        defaultValue: any = 'Failed to get cell value'
      ) {
        return get(
          row,
          Array.isArray(rowKey) ? rowKey[0] : rowKey,
          defaultValue
        );
      }

      return {
        attrs: computed(() => omit(attrs, ['class'])),
        // eslint-disable-next-line vue/no-dupe-keys
        sort,
        // eslint-disable-next-line vue/no-dupe-keys
        columns,
        // eslint-disable-next-line vue/no-dupe-keys
        rows,
        selected,
        indeterminate,
        isSelected,
        onSort,
        onSelect,
        onChange,
        getRowData
      };
    }
  });
</script>

<template>
  <div
    class="w-full"
    v-bind="attrs">
    <table
      :class="[
        'relative overflow-x-auto',
        'divide-y divide-gray-300 dark:divide-gray-700'
      ]">
      <thead class="">
        <tr class="">
          <th
            v-if="modelValue"
            scope="col"
            :class="['ps-4']">
            <input
              type="checkbox"
              :checked="indeterminate || selected.length === rows.length"
              @change="onChange" />
          </th>

          <th
            v-for="(column, index) in columns"
            :key="index"
            scope="col"
            class=""
            :class="[
              'text-left px-3 py-3.5 text-base-11 font-semibold text-xs',
              column.class
            ]">
            <slot
              :name="`${column.key}-header`"
              :column="column"
              :sort="sort"
              :on-sort="onSort">
              <button @click="onSort(column)">
                {{
                  !sort.column || sort.column !== column.key
                    ? ''
                    : sort.direction === 'asc'
                    ? '▲'
                    : '▼'
                }}
                <span class="uppercase">{{ column[columnAttribute] }}</span>
              </button>
            </slot>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-base-6 overflow-y-scroll">
        <tr v-if="loading">
          <td :colspan="columns.length + (modelValue ? 1 : 0)">
            <slot name="loading-state">
              <div
                class="flex flex-col items-center justify-center flex-1 px-6 py-14 sm:px-14">
                <p class="text-sm text-center text-gray-900 dark:text-white">
                  <Icon
                    name="svg-spinners:3-dots-fade"
                    size="24" />
                  Loading
                </p>
              </div>
            </slot>
          </td>
        </tr>

        <tr v-if="!rows.length">
          <td :colspan="columns.length + (modelValue ? 1 : 0)">
            <slot name="empty-state">
              <div
                class="flex flex-col items-center justify-center flex-1 px-6 py-14 sm:px-14">
                <p class="text-sm text-center text-gray-900 dark:text-white">
                  <Icon
                    name="ph-smiley-sad"
                    size="24" />
                  No data found
                </p>
              </div>
            </slot>
          </td>
        </tr>

        <template v-if="!loading && rows.length > 0">
          <tr
            v-for="(row, index) in rows"
            :key="index"
            :class="[
              '',
              isSelected(row) && 'bg-gray-50 dark:bg-gray-800/50',
              $attrs.onSelect &&
                'hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer'
            ]"
            @click="() => onSelect(row)">
            <td
              v-if="modelValue"
              class="ps-4">
              <input
                type="checkbox"
                :checked="isSelected(row)"
                @click.stop />
            </td>

            <td
              v-for="(column, subIndex) in columns"
              :key="subIndex"
              :class="[
                '',
                'px-3 py-4',
                'text-gray-500 dark:text-gray-400',
                'text-sm'
              ]">
              <slot
                :name="`${column.key}-data`"
                :column="column"
                :row="row"
                :index="index"
                :get-row-data="
                  (defaultValue: any) =>
                    getRowData(row, column.key, defaultValue)
                ">
                {{ getRowData(row, column.key) }}
              </slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
