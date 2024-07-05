'use client';

import { api } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useForm } from '@tanstack/react-form';
import { Input } from '@/src/components/shadcn-ui/input';
import { Switch } from '@/src/components/shadcn-ui/switch';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/src/components/shadcn-ui/select';
import { Button } from '@/src/components/shadcn-ui/button';
import { z } from 'zod';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { type TypeId } from '@u22n/utils/typeid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/src/components/shadcn-ui/dialog';
import { useState } from 'react';
import { type UiColor, uiColors } from '@u22n/utils/colors';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/src/components/shadcn-ui/tooltip';
import {
  Check,
  Globe,
  Plus,
  SquaresFour,
  UsersThree
} from '@phosphor-icons/react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/src/components/shadcn-ui/popover';

export function NewSpaceModal() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const invalidateTeams = api.useUtils().org.users.teams.getOrgTeams;

  const [formError, setFormError] = useState<string | null>(null);

  const { data: canAddSpace } = api.org.iCanHaz.space.useQuery(
    {
      orgShortCode: orgShortCode
    },
    {
      staleTime: 1000
    }
  );

  const { mutateAsync: createTeam, error: teamError } =
    api.org.users.teams.createTeam.useMutation({
      onSuccess: () => {
        void invalidateTeams.invalidate();
      }
    });

  const form = useForm({
    defaultValues: {
      spaceName: '',
      description: '',
      color: uiColors[Math.floor(Math.random() * uiColors.length)],
      type: 'open' as 'open' | 'shared'
    },
    validatorAdapter: zodValidator,
    onSubmit: async ({ value }) => {
      const team = await createTeam({
        orgShortCode,
        teamName: value.spaceName,
        teamColor: value.color ?? 'cyan',
        teamDescription: value.description ?? undefined
      });
    }
  });

  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (form.state.isSubmitting) return;
        setOpen(!open);
      }}>
      <DialogTrigger asChild>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Button
                size={'icon-sm'}
                variant={'ghost'}
                onClick={() => setOpen(true)}>
                <Plus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add new Space</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new Space</DialogTitle>
          <DialogDescription>
            Spaces are where a team, department, or group, can work with their
            own Conversations, Statuses and Tags.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex w-full flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}>
          <div className="flex flex-col">
            <label
              htmlFor="spaceName"
              className="font-medium">
              Color and name
            </label>
            <div className="flex flex-row items-center gap-2">
              <form.Field
                name="color"
                children={(field) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <div
                        className={
                          'flex h-8 min-h-8 w-8 min-w-8 items-center justify-center rounded-sm'
                        }
                        style={{
                          backgroundColor: `var(--${field.state.value}4)`
                        }}>
                        <SquaresFour
                          className={'h-5 w-5'}
                          weight="regular"
                          style={{
                            color: `var(--${field.state.value}9)`
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
                            className={`flex h-8 min-h-8 w-8 min-w-8 cursor-pointer items-center justify-center rounded-sm ${field.state.value === color ? `ring-base-9 ring-1 ring-offset-2` : ''}`}
                            style={{
                              backgroundColor: `var(--${color}4)`
                            }}
                            onClick={() => field.setValue(color)}>
                            {field.state.value === color ? (
                              <Check
                                className={'h-5 w-5'}
                                weight="regular"
                                style={{
                                  color: `var(--${color}9)`
                                }}
                              />
                            ) : (
                              <SquaresFour
                                className={'h-5 w-5'}
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
                )}
              />
              <form.Field
                name="spaceName"
                validators={{ onBlur: z.string().min(2).max(50) }}
                children={(field) => (
                  <div className="flex w-full flex-col items-center justify-between gap-2">
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                    />
                    {/* {field.state.meta.errorMap.onBlur && (
                        <span className="text-red-10">
                          {field.state.meta.errorMap.onBlur}
                        </span>
                      )} */}
                  </div>
                )}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="description"
              className="font-medium">
              Description
            </label>
            <form.Field
              name="description"
              validators={{ onBlur: z.string().min(0).max(500) }}
              children={(field) => (
                <>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errorMap.onBlur && (
                    <span className="text-red-10">
                      {field.state.meta.errorMap.onBlur}
                    </span>
                  )}
                </>
              )}
            />
          </div>
          <div className="flex w-full flex-col">
            <label
              htmlFor="type"
              className="font-medium">
              Permissions
            </label>
            <form.Field
              name="type"
              children={(field) => (
                <Select
                  onValueChange={(e: 'open' | 'shared') =>
                    field.handleChange(e)
                  }
                  defaultValue={field.state.value}>
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
                    {canAddSpace?.shared ? (
                      <SelectItem
                        value="shared"
                        className="hover:bg-base-3 w-full rounded-sm">
                        <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                          <UsersThree className="h-6 w-6" />
                          <div className="flex grow flex-col justify-start gap-2 text-left">
                            <span className="font-semibold">Shared</span>
                            <span className="text-base-11 text-balance text-xs">
                              Add specific members or teams to this Space with
                              specific permissions
                            </span>
                          </div>
                        </div>
                      </SelectItem>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger>
                          <SelectItem
                            disabled
                            value="shared"
                            className="hover:bg-base-3 w-full rounded-sm">
                            <div className="flex flex-row items-center justify-start gap-4 rounded-md p-1">
                              <UsersThree className="h-6 w-6" />
                              <div className="flex grow flex-col justify-start gap-2 text-left">
                                <div className="flex flex-row items-center gap-2">
                                  <span className="font-semibold">Shared</span>
                                  <span className="text-base-1 bg-base-12 rounded-sm px-1.5 py-0.5 text-xs">
                                    Pro plan
                                  </span>
                                </div>
                                <span className="text-base-11 text-xs">
                                  Public to everyone in your org
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
              )}
            />
          </div>
          <div className="text-red-10">{formError ?? teamError?.message}</div>
          <form.Subscribe
            selector={(form) => [
              form.isTouched,
              form.canSubmit,
              form.isSubmitting
            ]}
            children={([isTouched, canSubmit, isSubmitting]) => (
              <Button
                disabled={!isTouched || !canSubmit || isSubmitting}
                // loading={isSubmitting}
                className="my-1">
                {isSubmitting ? 'Creating...' : 'Create New Team'}
              </Button>
            )}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
