'use client';

import { platform } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useForm } from '@tanstack/react-form';
import { Input } from '@/src/components/shadcn-ui/input';
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
  DialogDescription
} from '@/src/components/shadcn-ui/dialog';
import { useState } from 'react';
import { Separator } from '@/src/components/shadcn-ui/separator';
import Link from 'next/link';

export function AddEmailModal() {
  const orgShortCode = useGlobalStore((state) => state.currentOrg.shortCode);
  const invalidateEmails =
    platform.useUtils().org.mail.emailIdentities.getOrgEmailIdentities;

  const { mutateAsync: createEmailIdentity, error: emailIdentityError } =
    platform.org.mail.emailIdentities.createNewEmailIdentity.useMutation({
      onSuccess: () => {
        void invalidateEmails.invalidate();
        setOpen(false);
      }
    });

  const form = useForm({
    defaultValues: {
      address: '',
      domain: null as TypeId<'domains'> | null,
      catchAll: false,
      sendName: '',
      deliversTo: {
        users: [] as TypeId<'orgMembers'>[],
        teams: [] as TypeId<'teams'>[]
      }
    },
    validatorAdapter: zodValidator,
    onSubmit: async ({ value }) => {
      if (!value.domain) return;
      await createEmailIdentity({
        orgShortCode,
        domainPublicId: value.domain,
        emailUsername: value.address,
        sendName: value.sendName,
        catchAll: value.catchAll,
        routeToOrgMemberPublicIds:
          value.deliversTo.users.length > 0
            ? value.deliversTo.users
            : undefined,
        routeToTeamsPublicIds:
          value.deliversTo.teams.length > 0 ? value.deliversTo.teams : undefined
      }).catch(() => null);
    }
  });

  const { data: orgDomains, isLoading: orgDomainsLoading } =
    platform.org.mail.domains.getOrgDomains.useQuery({
      orgShortCode
    });

  const { data: orgMembers, isLoading: orgMembersLoading } =
    platform.org.users.members.getOrgMembers.useQuery({
      orgShortCode
    });

  const { data: orgTeams, isLoading: orgTeamsLoading } =
    platform.org.users.teams.getOrgTeams.useQuery({ orgShortCode });

  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (form.state.isSubmitting) return;
        setOpen(!open);
      }}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>New Address</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Email Address</DialogTitle>
          <DialogDescription>
            Add new email address using your verified domains in your org
          </DialogDescription>
        </DialogHeader>
        <form
          className="my-2 flex w-full flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}>
          <div className="flex w-full flex-col gap-2">
            <div className="text-muted-foreground font-bold uppercase">
              Email Address
            </div>
            <div className="flex gap-1">
              <form.Field
                name="address"
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
                    className="w-full flex-1"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="Username"
                  />
                )}
              />
              <span className="flex items-center">@</span>
              <form.Field
                name="domain"
                validators={{ onChange: z.string().min(1) }}
                children={(field) => (
                  <Select
                    name={field.name}
                    value={field.state.value ?? ''}
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
                        {orgDomainsLoading && <div>Loading...</div>}
                        {orgDomains?.domainData.map((domain) => (
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
              name="sendName"
              validators={{ onBlur: z.string().min(1).max(64) }}
              children={(field) => (
                <>
                  <Input
                    id={field.name}
                    className="w-full"
                    name={field.name}
                    value={field.state.value ?? ''}
                    onChange={(e) => field.handleChange(e.target.value)}
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
          </div>
          <Separator className="my-2" />
          <div className="text-muted-foreground font-bold uppercase">
            Deliver Messages To
          </div>
          <div className="flex w-full flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold">Teams</label>
                </div>
                <form.Field
                  name="deliversTo.teams"
                  children={(field) => (
                    <>
                      {orgTeamsLoading && <div>Loading...</div>}
                      <MultiSelect
                        values={field.state.value ?? []}
                        setValues={(values) =>
                          field.handleChange(values as TypeId<'teams'>[])
                        }
                        items={
                          orgTeams?.teams.map((item) => ({
                            ...item,
                            value: item.publicId,
                            keywords: [
                              item.name,
                              item.description ?? '',
                              item.color ?? ''
                            ]
                          })) ?? []
                        }
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
                          <div className="flex flex-wrap gap-2">
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
                    </>
                  )}
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-bold">Users</label>
                </div>
                <form.Field
                  name="deliversTo.users"
                  children={(field) => (
                    <>
                      {orgMembersLoading && <div>Loading...</div>}
                      <MultiSelect
                        values={field.state.value ?? []}
                        setValues={(values) =>
                          field.handleChange(values as TypeId<'orgMembers'>[])
                        }
                        items={
                          orgMembers?.members?.map((item) => ({
                            ...item,
                            value: item.publicId,
                            keywords: [
                              item.profile.handle ?? '',
                              item.profile.title ?? '',
                              item.profile.blurb ?? ''
                            ]
                          })) ?? []
                        }
                        ItemRenderer={(item) => (
                          <div className="flex">
                            {item.profile.firstName} {item.profile.lastName}
                          </div>
                        )}
                        TriggerRenderer={({ items }) => (
                          <div className="flex flex-wrap gap-2">
                            {items.map((item, i, users) => (
                              <div key={item.publicId}>
                                {item.profile.firstName} {item.profile.lastName}
                                {i < users.length - 1 ? ', ' : ''}
                              </div>
                            ))}
                          </div>
                        )}
                        emptyPlaceholder="Select users"
                      />
                    </>
                  )}
                />
              </div>
            </div>

            <div className="text-red-10">{emailIdentityError?.message}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                asChild>
                <Link
                  href={`/${orgShortCode}/settings/org/mail/addresses/external`}>
                  Add External Email Instead
                </Link>
              </Button>
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
                    className="flex-1">
                    {isSubmitting ? 'Creating...' : 'Create New Email Address'}
                  </Button>
                )}
              />
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
