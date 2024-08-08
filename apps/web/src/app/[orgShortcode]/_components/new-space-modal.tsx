'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/src/components/shadcn-ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/src/components/shadcn-ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/src/components/shadcn-ui/popover';
import {
  Check,
  Globe,
  Plus,
  SquaresFour,
  UsersThree
} from '@phosphor-icons/react';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { spaceTypeArray, type SpaceType } from '@u22n/utils/spaces';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { uiColors } from '@u22n/utils/colors';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { z } from 'zod';

const newSpaceFormSchema = z.object({
  spaceName: z.string().min(1).max(64),
  description: z.string().min(0).max(128).optional(),
  color: z.enum(uiColors),
  type: z.enum(spaceTypeArray)
});

export function NewSpaceModal() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const invalidateSpaces = platform.useUtils().spaces.getOrgMemberSpaces;
  const router = useRouter();

  const { data: canAddSpace } = platform.org.iCanHaz.space.useQuery(
    {
      orgShortcode: orgShortcode
    },
    {
      staleTime: 1000
    }
  );
  const { mutateAsync: createNewSpace, isPending: isSubmitting } =
    platform.spaces.createNewSpace.useMutation({
      onSuccess: (data) => {
        void invalidateSpaces.invalidate();
        setOpen(false);
        void router.push(`/${orgShortcode}/${data.spaceShortcode}`);
      }
    });

  const form = useForm<z.infer<typeof newSpaceFormSchema>>({
    resolver: zodResolver(newSpaceFormSchema),
    defaultValues: {
      spaceName: '',
      description: '',
      color: uiColors[Math.floor(Math.random() * uiColors.length)],
      type: 'open' as SpaceType
    }
  });

  const handleSubmit = async (values: z.infer<typeof newSpaceFormSchema>) => {
    await createNewSpace({
      orgShortcode: orgShortcode,
      spaceName: values.spaceName,
      spaceDescription: values.description,
      spaceColor: values.color ?? 'cyan',
      spaceType: values.type
    }).catch(() => null);
    form.reset();
  };

  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (isSubmitting) return;
        setOpen(!open);
      }}>
      <DialogTrigger asChild>
        <Button
          size={'icon-sm'}
          variant={'ghost'}
          onClick={() => setOpen(true)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Plus />
            </TooltipTrigger>
            <TooltipContent>Add new Space</TooltipContent>
          </Tooltip>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new Space</DialogTitle>
          <DialogDescription>
            Spaces are where a team, department, or group, can work with their
            own Conversations, Statuses and Tags.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="flex flex-row items-center gap-4">
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem className="w-fit">
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <div
                          className={
                            'flex size-10 min-h-10 min-w-10 items-center justify-center rounded-sm'
                          }
                          style={{
                            backgroundColor: `var(--${field.value}4)`
                          }}>
                          <SquaresFour
                            className={'size-6'}
                            weight="regular"
                            style={{
                              color: `var(--${field.value}9)`
                            }}
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="">
                        <div
                          className="flex flex-row flex-wrap gap-3"
                          style={{ padding: '0px' }}>
                          {uiColors.map((color) => (
                            <div
                              key={color}
                              className={`flex size-10 min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-sm ${field.value === color ? `ring-base-9 ring-1 ring-offset-2` : ''}`}
                              style={{
                                backgroundColor: `var(--${color}4)`
                              }}
                              onClick={() => field.onChange(color)}>
                              {field.value === color ? (
                                <Check
                                  className={'size-6'}
                                  weight="regular"
                                  style={{
                                    color: `var(--${color}9)`
                                  }}
                                />
                              ) : (
                                <SquaresFour
                                  className={'size-6'}
                                  weight="regular"
                                  style={{
                                    color: `var(--${color}9)`
                                  }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="spaceName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      label="Name"
                      inputSize={'lg'}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    label="Description"
                    fullWidth
                    inputSize="lg"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}>
                  <span className="text-base-11 text-sm">Permissions</span>
                  <SelectTrigger className="h-18">
                    <SelectValue placeholder="Select a verified email to display" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="open"
                      className="hover:bg-base-3 w-full rounded-sm">
                      <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                        <Globe className="h-6 w-6" />
                        <div className="flex grow flex-col justify-start gap-2 text-left">
                          <span className="font-semibold">Open</span>
                          <span className="text-base-11 text-balance text-xs">
                            Everyone can see this Space, read messages and post
                            comments
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                    {canAddSpace?.private ? (
                      <SelectItem
                        value="private"
                        className="hover:bg-base-3 w-full rounded-sm">
                        <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                          <UsersThree className="h-6 w-6" />
                          <div className="flex grow flex-col justify-start gap-2 text-left">
                            <span className="font-semibold">Private</span>
                            <span className="text-base-11 text-balance text-xs">
                              Only specific people can see and interact with
                              this space
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger>
                          <SelectItem
                            disabled
                            value="private"
                            className="hover:bg-base-3 w-full rounded-sm">
                            <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                              <UsersThree className="h-6 w-6" />
                              <div className="flex grow flex-col justify-start gap-2 text-left">
                                <div className="flex flex-row items-center gap-2">
                                  <span className="font-semibold">Private</span>
                                  <span className="text-base-1 bg-base-12 rounded-sm px-1.5 py-0.5 text-xs">
                                    Pro plan
                                  </span>
                                </div>
                                <span className="text-base-11 text-xs">
                                  Only specific people can see and interact with
                                  this space
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        </TooltipTrigger>
                        <TooltipContent>
                          <span>
                            Upgrade to{' '}
                            <span className="font-semibold">Pro</span> plan to
                            enable this feature
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button
              loading={isSubmitting}
              // loading={isSubmitting}
              onClick={form.handleSubmit(handleSubmit)}
              className="my-1">
              {isSubmitting ? 'Creating...' : 'Create New Space'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
