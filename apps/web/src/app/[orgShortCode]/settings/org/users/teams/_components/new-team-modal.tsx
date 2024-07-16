'use client';

import { platform } from '@/src/lib/trpc';
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

export function NewTeamModal() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const invalidateTeams = platform.useUtils().org.users.teams.getOrgTeams;

  const utils = platform.useUtils();
  const checkEmailAvailability =
    utils.org.mail.emailIdentities.checkEmailAvailability;

  const [formError, setFormError] = useState<string | null>(null);

  const { data: canAddTeam, isLoading } = platform.org.iCanHaz.team.useQuery(
    {
      orgShortCode: orgShortCode
    },
    {
      staleTime: 1000
    }
  );

  const { mutateAsync: createTeam, error: teamError } =
    platform.org.users.teams.createTeam.useMutation({
      onSuccess: () => {
        void invalidateTeams.invalidate();
      }
    });

  const { mutateAsync: createEmailIdentity, error: emailError } =
    platform.org.mail.emailIdentities.createNewEmailIdentity.useMutation({
      onSuccess: () => {
        setOpen(false);
      }
    });

  const form = useForm({
    defaultValues: {
      teamName: '',
      description: '',
      color: 'red' as UiColor,
      email: {
        create: false,
        address: '',
        domain: '' as TypeId<'domains'>,
        sendName: ''
      }
    },
    validatorAdapter: zodValidator,
    onSubmit: async ({ value }) => {
      if (value.email.create) {
        const emailAvailable = await checkEmailAvailability.fetch({
          orgShortCode,
          emailUsername: value.email.address,
          domainPublicId: value.email.domain
        });
        if (!emailAvailable.available) {
          setFormError('This is email is not available or is already in use');
          return;
        }
      }

      const team = await createTeam({
        orgShortCode,
        teamName: value.teamName,
        teamColor: value.color,
        teamDescription: value.description ?? undefined
      });

      if (value.email.create) {
        await createEmailIdentity({
          orgShortCode,
          domainPublicId: value.email.domain,
          emailUsername: value.email.address,
          sendName: value.email.sendName,
          catchAll: false,
          routeToTeamsPublicIds: [team.newTeamPublicId]
        });
      }
    }
  });

  const { data: orgDomains, isLoading: orgDomainsLoading } =
    platform.org.mail.domains.getOrgDomains.useQuery({
      orgShortCode
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
        <Button onClick={() => setOpen(true)}>New Team</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>Create a new Team for your Org</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div>Loading...</div>
        ) : !canAddTeam ? (
          <div>
            Your Current Billing Plan does not allow you to create Teams
          </div>
        ) : (
          <form
            className="my-2 flex w-fit flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void form.handleSubmit();
            }}>
            <div className="flex w-full gap-2">
              <div className="flex flex-col">
                <label
                  htmlFor="teamName"
                  className="font-semibold">
                  Team Name
                </label>
                <form.Field
                  name="teamName"
                  validators={{ onBlur: z.string().min(2).max(50) }}
                  children={(field) => (
                    <>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value ?? ''}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        className="w-72"
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
              <div className="flex flex-col">
                <label
                  htmlFor="description"
                  className="font-semibold">
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
            </div>
            <div className="flex w-full gap-2">
              <div className="flex flex-1 flex-col">
                <label className="font-semibold">Color</label>
                <form.Field
                  name="color"
                  children={(field) => (
                    <Select
                      name={field.name}
                      value={field.state.value ?? ''}
                      onValueChange={(e: UiColor) => field.handleChange(e)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        id={field.name}
                        onBlur={field.handleBlur}>
                        <SelectGroup>
                          {uiColors.map((color) => (
                            <SelectItem
                              value={color}
                              key={color}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-4 w-4 rounded-full"
                                  style={{
                                    backgroundColor: `var(--${color}-10)`
                                  }}
                                />
                                <div className="capitalize">{color}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="mt-4 flex w-full flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="font-bold">
                  Create an Address for the User
                </label>
                <form.Field
                  name="email.create"
                  children={(field) => (
                    <Switch
                      checked={field.state.value ?? false}
                      onCheckedChange={field.handleChange}
                      onBlur={field.handleBlur}
                    />
                  )}
                />
              </div>
              <form.Subscribe
                selector={(form) => form.values.email.create}
                children={(createEmail) =>
                  createEmail && (
                    <>
                      {orgDomainsLoading && <div>Loading...</div>}
                      {orgDomains && (
                        <>
                          <div className="flex gap-1">
                            <form.Field
                              name="email.address"
                              validators={{
                                onBlur: z
                                  .string()
                                  .min(2)
                                  .max(32)
                                  .regex(/^[a-zA-Z0-9._-]*$/, {
                                    message: 'Only letters and numbers'
                                  })
                              }}
                              children={(field) => (
                                <div className="flex flex-col">
                                  <Input
                                    className="w-full flex-1"
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value ?? ''}
                                    onChange={(e) =>
                                      field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                    placeholder="username"
                                  />
                                  {field.state.meta.errorMap.onBlur && (
                                    <span className="text-red-10">
                                      {field.state.meta.errorMap.onBlur}
                                    </span>
                                  )}
                                </div>
                              )}
                            />
                            <span className="flex items-center">@</span>
                            <form.Field
                              name="email.domain"
                              validators={{ onChange: z.string().min(1) }}
                              children={(field) => (
                                <Select
                                  name={field.name}
                                  value={field.state.value}
                                  onValueChange={(e: TypeId<'domains'>) =>
                                    field.handleChange(e)
                                  }>
                                  <SelectTrigger className="w-full flex-1">
                                    <SelectValue placeholder="Select domain" />
                                  </SelectTrigger>
                                  <SelectContent
                                    id={field.name}
                                    onBlur={field.handleBlur}>
                                    <SelectGroup>
                                      {orgDomains.domainData.map((domain) => (
                                        <SelectItem
                                          key={domain.publicId}
                                          value={domain.publicId}>
                                          {domain.domain}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                          <form.Field
                            name="email.sendName"
                            validators={{ onBlur: z.string().min(1).max(64) }}
                            children={(field) => (
                              <>
                                <Input
                                  id={field.name}
                                  className="w-full"
                                  name={field.name}
                                  value={field.state.value ?? ''}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                  onBlur={field.handleBlur}
                                  placeholder="Send Name"
                                />
                                {field.state.meta.errorMap.onBlur && (
                                  <span className="text-red-10">
                                    {field.state.meta.errorMap.onBlur}
                                  </span>
                                )}
                              </>
                            )}
                          />
                        </>
                      )}
                    </>
                  )
                }
              />
            </div>
            <div className="mt-4 flex w-full flex-col gap-2">
              <div className="text-red-10">
                {formError ?? teamError?.message ?? emailError?.message}
              </div>
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
              <DialogClose asChild>
                <form.Subscribe
                  selector={(form) => form.isSubmitting}
                  children={(isSubmitting) => (
                    <Button
                      className="w-full"
                      disabled={isSubmitting}
                      onMouseDown={() => setOpen(false)}>
                      Cancel
                    </Button>
                  )}
                />
              </DialogClose>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
