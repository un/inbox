'use client';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '../shadcn-ui/command';
import {
  type FC,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction
} from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../shadcn-ui/popover';
import { Check, CaretUpDown } from '@phosphor-icons/react';
import { Button } from '../shadcn-ui/button';
import { cn } from '@/src/lib/utils';

type Item<T extends Record<string, unknown>> = {
  value: string;
  keywords?: string[];
} & T;

type MultiSelectProps<T extends Record<string, unknown>> = {
  items: Item<T>[];
  emptyPlaceholder?: ReactNode;
  searchPlaceholder?: string;
  noResultsPlaceholder?: ReactNode;
  ItemRenderer: FC<Item<T>>;
  TriggerRenderer: FC<{ items: Item<T>[] }>;
  values: string[];
  setValues: Dispatch<SetStateAction<string[]>>;
  fullWidth?: boolean;
};

export function MultiSelect<T extends Record<string, unknown>>({
  items,
  emptyPlaceholder,
  searchPlaceholder,
  noResultsPlaceholder,
  ItemRenderer,
  TriggerRenderer,
  values,
  setValues,
  fullWidth
}: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-full w-fit min-w-[200px] justify-between',
            fullWidth && 'w-full'
          )}>
          {values.length > 0 ? (
            <TriggerRenderer
              items={items.filter((item) => values.includes(item.value))}
            />
          ) : (
            emptyPlaceholder ?? 'Select an Item'
          )}
          <CaretUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command
          filter={(value, search, keywords) => {
            const extendedValue = value + ' ' + keywords?.join(' ') ?? '';
            return extendedValue.toLowerCase().includes(search.toLowerCase())
              ? 1
              : 0;
          }}>
          <CommandInput placeholder={searchPlaceholder ?? 'Search'} />
          <CommandList>
            <CommandEmpty>
              {noResultsPlaceholder ?? 'Nothing Found'}
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  keywords={item.keywords ?? []}
                  value={item.value}
                  onSelect={(currentValue) => {
                    setValues((prevValues) =>
                      prevValues.includes(currentValue)
                        ? prevValues.filter((value) => value !== currentValue)
                        : prevValues.concat(currentValue)
                    );
                  }}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      values.includes(item.value) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <ItemRenderer
                    key={item.value}
                    {...item}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
