'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription
} from '@/src/components/shadcn-ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { MultiSelect } from '@/src/components/shared/multiselect';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { Button } from '@/src/components/shadcn-ui/button';
import { Switch } from '@/src/components/shadcn-ui/switch';
import { Input } from '@/src/components/shadcn-ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { At } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';

const addressFormSchema = z.object({
  address: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-zA-Z0-9._-]*$/, {
      message: 'Only letters and numbers'
    }),
  domain: z.string().min(1, 'You must select a domain'),
  sendName: z.string().min(1, 'You must enter a send name').max(64),
  catchAll: z.boolean(),
  deliversTo: z.object({
    users: z.string().array(),
    teams: z.string().array()
  })
});

export function AddEmailModal() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const invalidateEmails =
    platform.useUtils().org.mail.emailIdentities.getOrgEmailIdentities;

  const {
    mutateAsync: createEmailIdentity,
    isPending: isCreatingIdentity,
    error: emailIdentityError
  } = platform.org.mail.emailIdentities.createNewEmailIdentity.useMutation({
    onSuccess: () => {
      void invalidateEmails.invalidate();
      setOpen(false);
    }
  });

  const form = useForm<z.infer<typeof addressFormSchema>>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      address: '',
      domain: '',
      catchAll: false,
      sendName: '',
      deliversTo: {
        users: [],
        teams: []
      }
    }
  });

  const { data: orgDomains, isLoading: orgDomainsLoading } =
    platform.org.mail.domains.getOrgDomains.useQuery({
      orgShortcode
    });

  const { data: orgMembers, isLoading: orgMembersLoading } =
    platform.org.users.members.getOrgMembers.useQuery({
      orgShortcode
    });

  const { data: orgTeams, isLoading: orgTeamsLoading } =
    platform.org.users.teams.getOrgTeams.useQuery({ orgShortcode });

  const [open, setOpen] = useState(false);

  const handleSubmit = async (values: z.infer<typeof addressFormSchema>) => {
    if (
      values.deliversTo.teams.length === 0 &&
      values.deliversTo.users.length === 0
    ) {
      form.setError('deliversTo', {
        message: 'You must select at least one team or user'
      });
      return;
    }
    await createEmailIdentity({
      orgShortcode,
      domainPublicId: values.domain,
      emailUsername: values.address,
      sendName: values.sendName,
      catchAll: values.catchAll,
      routeToOrgMemberPublicIds:
        values.deliversTo.users.length > 0
          ? values.deliversTo.users
          : undefined,
      routeToTeamsPublicIds:
        values.deliversTo.teams.length > 0 ? values.deliversTo.teams : undefined
    }).catch(() => null);
    form.reset();
  };
  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (isCreatingIdentity) return;
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
        <Form {...form}>
          <div className="my-2 flex w-full flex-col gap-2">
            <div className="text-sm font-bold">Email Address</div>
            <div className="flex w-full gap-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        label="Email Username"
                        fullWidth
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <span className="my-[10px] flex items-start">
                <At
                  className="size-4"
                  weight="bold"
                />
              </span>
              <FormField
                control={form.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full flex-1">
                          <SelectValue placeholder="Select domain" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                      <FormMessage />
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="sendName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      label="Send Name"
                      inputSize="lg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator className="my-2" />

            <FormField
              control={form.control}
              name="catchAll"
              render={({ field }) => (
                <FormItem className="mb-2 flex items-center gap-4">
                  <div className="mt-2 text-sm font-bold">
                    Catch All Address
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm font-bold">Deliver Messages To</div>
            <div className="flex w-full flex-col gap-2">
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Teams</label>
                  </div>
                  <FormField
                    control={form.control}
                    name="deliversTo.teams"
                    render={({ field }) => (
                      <>
                        {orgTeamsLoading && <div>Loading...</div>}
                        <MultiSelect
                          fullWidth
                          values={field.value}
                          setValues={(actionOrValue) => {
                            if (typeof actionOrValue === 'function') {
                              form.setValue(
                                'deliversTo.users',
                                actionOrValue(field.value)
                              );
                            } else {
                              form.setValue('deliversTo.users', actionOrValue);
                            }
                          }}
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
                                  backgroundColor: `var(--${item.color}10)`
                                }}
                              />
                              {item.name}
                            </div>
                          )}
                          TriggerRenderer={({ items }) => (
                            <div className="flex flex-1 flex-wrap gap-2">
                              {items.map((item) => (
                                <div
                                  key={item.value}
                                  className="flex w-full items-center gap-1">
                                  <div
                                    className="h-4 w-4 rounded-full border"
                                    style={{
                                      backgroundColor: `var(--${item.color}10)`
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
                  <FormField
                    control={form.control}
                    name="deliversTo.users"
                    render={({ field }) => (
                      <>
                        {orgMembersLoading && <div>Loading...</div>}
                        <MultiSelect
                          fullWidth
                          values={field.value}
                          setValues={(actionOrValue) => {
                            if (typeof actionOrValue === 'function') {
                              form.setValue(
                                'deliversTo.users',
                                actionOrValue(field.value)
                              );
                            } else {
                              form.setValue('deliversTo.users', actionOrValue);
                            }
                          }}
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
                                  {item.profile.firstName}{' '}
                                  {item.profile.lastName}
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
              <div className="text-red-10 text-sm">
                {emailIdentityError?.message ??
                  form.getFieldState('deliversTo').error?.message}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  asChild>
                  <Link
                    href={`/${orgShortcode}/settings/org/mail/addresses/external`}>
                    Add External Email Instead
                  </Link>
                </Button>
                <Button
                  loading={isCreatingIdentity}
                  className="flex-1"
                  onClick={form.handleSubmit(handleSubmit)}>
                  {isCreatingIdentity
                    ? 'Creating...'
                    : 'Create New Email Address'}
                </Button>
              </div>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
