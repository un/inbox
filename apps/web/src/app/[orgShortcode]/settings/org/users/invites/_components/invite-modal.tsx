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
import { MultiSelect } from '@/src/components/shared/multiselect';
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

export function InviteModal() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const invalidateInvites = platform.useUtils().org.users.invites.viewInvites;

  const { mutateAsync: createInvite, error: inviteError } =
    platform.org.users.invites.createNewInvite.useMutation({
      onSuccess: () => {
        void invalidateInvites.invalidate();
        setOpen(false);
      }
    });

  const form = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      role: 'member' as 'member' | 'admin',
      title: '',
      invite: {
        sendInvite: false,
        email: ''
      },
      email: {
        create: false,
        address: '',
        domain: '' as TypeId<'domains'>,
        sendName: ''
      },
      team: {
        addToTeams: false,
        teams: [] as TypeId<'teams'>[]
      }
    },
    validatorAdapter: zodValidator,
    onSubmit: async ({ value }) => {
      await createInvite({
        orgShortcode,
        newOrgMember: {
          firstName: value.firstName,
          lastName: value.lastName.length ? value.lastName : undefined,
          role: value.role,
          title: value.title.length ? value.title : undefined
        },
        email: value.email.create
          ? {
              emailUsername: value.email.address,
              domainPublicId: value.email.domain,
              sendName: value.email.sendName
            }
          : undefined,
        notification: value.invite.sendInvite
          ? { notificationEmailAddress: value.invite.email }
          : undefined,
        teams: value.team.addToTeams
          ? { teamsPublicIds: value.team.teams }
          : undefined
      });
    }
  });

  const { data: orgDomains, isLoading: orgDomainsLoading } =
    platform.org.mail.domains.getOrgDomains.useQuery({
      orgShortcode
    });

  const { data: orgTeams, isLoading: orgTeamsLoading } =
    platform.org.users.teams.getOrgTeams.useQuery({ orgShortcode });

  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (form.state.isSubmitting) return;
        setOpen(!open);
      }}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>New Invite</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Invite</DialogTitle>
          <DialogDescription>
            Create a new Invite for your Org
          </DialogDescription>
        </DialogHeader>
        <form
          className="my-2 flex w-fit flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}>
          <div className="flex w-full gap-2">
            <form.Field
              name="firstName"
              validators={{ onBlur: z.string().min(1).max(64) }}
              children={(field) => (
                <>
                  <Input
                    label="First Name"
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

            <form.Field
              name="lastName"
              validators={{ onBlur: z.string().min(0).max(64) }}
              children={(field) => (
                <>
                  <Input
                    label="Last Name (Optional)"
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
          <div className="flex w-full gap-2">
            <div className="flex flex-1 flex-col">
              <label className="font-semibold">Role</label>
              <form.Field
                name="role"
                children={(field) => (
                  <Select
                    name={field.name}
                    value={field.state.value ?? ''}
                    onValueChange={(e: 'member' | 'admin') =>
                      field.handleChange(e)
                    }>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      id={field.name}
                      onBlur={field.handleBlur}>
                      <SelectGroup>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <form.Field
              name="title"
              validators={{ onBlur: z.string().min(0).max(64) }}
              children={(field) => (
                <>
                  <Input
                    label="Title (Optional)"
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
          <div className="mt-4 flex w-full flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="font-bold">Send Invitation via Email</label>
              <form.Field
                name="invite.sendInvite"
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
              selector={(form) => form.values.invite.sendInvite}
              children={(sendInvite) =>
                sendInvite && (
                  <form.Field
                    name="invite.email"
                    validators={{ onBlur: z.string().email() }}
                    children={(field) => (
                      <>
                        <Input
                          label="Invite Email Address"
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
                )
              }
            />
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
                                .min(1)
                                .max(32)
                                .regex(/^[a-zA-Z0-9._-]*$/, {
                                  message: 'Only letters and numbers'
                                })
                            }}
                            children={(field) => (
                              <Input
                                label="Email Username"
                                className="w-full flex-1"
                                id={field.name}
                                name={field.name}
                                value={field.state.value ?? ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                onBlur={field.handleBlur}
                              />
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
                                label="Send Name"
                                id={field.name}
                                className="w-full"
                                name={field.name}
                                value={field.state.value ?? ''}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
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
                      </>
                    )}
                  </>
                )
              }
            />
          </div>
          <div className="mt-4 flex w-full flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="font-bold">Add User to Teams</label>
              <form.Field
                name="team.addToTeams"
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
              selector={(form) => form.values.team.addToTeams}
              children={(createEmail) =>
                createEmail && (
                  <>
                    {orgTeamsLoading && <div>Loading...</div>}
                    {orgTeams && (
                      <form.Field
                        name="team.teams"
                        children={(field) => (
                          <MultiSelect
                            values={field.state.value ?? []}
                            setValues={(values) =>
                              field.handleChange(values as TypeId<'teams'>[])
                            }
                            items={orgTeams.teams.map((item) => ({
                              ...item,
                              value: item.publicId,
                              keywords: [
                                item.name,
                                item.description ?? '',
                                item.color ?? ''
                              ]
                            }))}
                            ItemRenderer={(item) => (
                              <div className="flex gap-1">
                                <div
                                  className="h-4 w-4 rounded-full border"
                                  style={{
                                    backgroundColor: `var(--${item.color}-10)`
                                  }}
                                />
                                {item.name}
                              </div>
                            )}
                            TriggerRenderer={({ items }) => (
                              <div className="flex gap-1">
                                {items.map((item) => (
                                  <div
                                    key={item.value}
                                    className="flex items-center gap-1">
                                    <div
                                      className="h-4 w-4 rounded-full border"
                                      style={{
                                        backgroundColor: `var(--${item.color}-10)`
                                      }}
                                    />
                                    <div>{item.name}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                            emptyPlaceholder="Select teams"
                          />
                        )}
                      />
                    )}
                  </>
                )
              }
            />
            <div className="text-red-10">{inviteError?.message}</div>
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
                  {isSubmitting ? 'Creating...' : 'Create New Invite'}
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
      </DialogContent>
    </Dialog>
  );
}
