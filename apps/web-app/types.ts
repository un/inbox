import type { Storage, StorageValue } from 'unstorage';

// Patch type errors until we find a fix
declare module '#imports' {
  export function useStorage<T extends StorageValue = StorageValue>(
    base?: string
  ): Storage<T>;
}
