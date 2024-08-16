'use client';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/src/components/shadcn-ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/src/components/shadcn-ui/tabs';
import { MultiSelect } from '@/src/components/shared/multiselect';
import { type TypeId, typeIdValidator } from '@u22n/utils/typeid';
import { Separator } from '@/src/components/shadcn-ui/separator';
import { PasswordInput } from '@/src/components/password-input';
import { Checkbox } from '@/src/components/shadcn-ui/checkbox';
import { PageTitle } from '../../../../_components/page-title';
import { Button } from '@/src/components/shadcn-ui/button';
import { Switch } from '@/src/components/shadcn-ui/switch';
import { Input } from '@/src/components/shadcn-ui/input';
import { useOrgShortcode } from '@/src/hooks/use-params';
import { zodResolver } from '@hookform/resolvers/zod';
import { SquaresFour } from '@phosphor-icons/react';
import { Avatar } from '@/src/components/avatar';
import { useRouter } from 'next/navigation';
import { At } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

export default function Page() {
  const orgShortcode = useOrgShortcode();
  const [addMode, setAddMode] = useState<'native' | 'external'>('native');

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <PageTitle
        title="Add a new Email Address"
        backButtonLink={`/${orgShortcode}/settings/org/mail/addresses`}
      />
      <Tabs
        defaultValue="native"
        onValueChange={(value) => setAddMode(value as 'native' | 'external')}>
        <TabsList className="px-2 py-6">
          <TabsTrigger
            value="native"
            className="text-base">
            UnInbox Managed
          </TabsTrigger>
          <TabsTrigger
            value="external"
            className="text-base">
            External Address
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {addMode === 'native' && <AddEmail />}
      {addMode === 'external' && <AddExternalEmail />}
    </div>
  );
}

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
  spaces: z.array(typeIdValidator('spaces')).min(1),
  anyoneCanSend: z.boolean(),
  canSend: z.object({
    users: z.array(typeIdValidator('orgMembers')),
    teams: z.array(typeIdValidator('teams'))
  })
});

function AddEmail() {
  const orgShortcode = useOrgShortcode();

  const invalidateEmails =
    platform.useUtils().org.mail.emailIdentities.getOrgEmailIdentities;
  const invalidateUserEmails =
    platform.useUtils().org.mail.emailIdentities.getUserEmailIdentities;

  const router = useRouter();

  const {
    mutateAsync: createEmailIdentity,
    isPending: isCreatingIdentity,
    error: emailIdentityError
  } = platform.org.mail.emailIdentities.createNewEmailIdentity.useMutation({
    onSuccess: () => {
      form.reset();
      void invalidateEmails.invalidate();
    }
  });

  const form = useForm<z.infer<typeof addressFormSchema>>({
    resolver: zodResolver(addressFormSchema),

    defaultValues: {
      address: '',
      domain: '',
      catchAll: false,
      sendName: '',
      spaces: [],
      anyoneCanSend: true,
      canSend: {
        users: [] as TypeId<'orgMembers'>[],
        teams: [] as TypeId<'teams'>[]
      }
    }
  });

  const { data: orgDomains, isLoading: orgDomainsLoading } =
    platform.org.mail.domains.getOrgDomains.useQuery({
      orgShortcode
    });

  const { data: spaces, isLoading: spacesLoading } =
    platform.spaces.getAllOrgSpacesWithPersonalSeparately.useQuery({
      orgShortcode
    });

  const { data: orgMembers, isLoading: orgMembersLoading } =
    platform.org.users.members.getOrgMembers.useQuery({
      orgShortcode
    });

  const { data: orgTeams, isLoading: orgTeamsLoading } =
    platform.org.users.teams.getOrgTeams.useQuery({ orgShortcode });

  const handleSubmit = async (values: z.infer<typeof addressFormSchema>) => {
    if (
      values.anyoneCanSend === false &&
      values.canSend.teams.length === 0 &&
      values.canSend.users.length === 0
    ) {
      form.setError('canSend', {
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
      routeToSpacesPublicIds: values.spaces,
      canSend: {
        anyone: values.anyoneCanSend,
        users: values.canSend.users,
        teams: values.canSend.teams
      }
    });

    await invalidateUserEmails.invalidate();
    await invalidateEmails.invalidate();

    router.push(`/${orgShortcode}/settings/org/mail/addresses`);
  };

  return (
    <div>
      <Form {...form}>
        <div className="my-2 flex w-full flex-col gap-2">
          {/* {JSON.stringify(spaces)} */}
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
                <div className="mt-2 text-sm font-bold">Catch All Address</div>
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

          <div className="text-sm font-bold">
            Deliver messages to the following Spaces
          </div>
          <div className="flex w-full flex-1 flex-col gap-1">
            <FormField
              control={form.control}
              name="spaces"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Spaces</FormLabel>
                    <FormDescription>
                      Deliver messages to the following Spaces
                    </FormDescription>
                  </div>
                  {spacesLoading && <div>Loading...</div>}
                  <div className="flex w-full flex-1 flex-col gap-2">
                    <div className="flex w-full flex-1 flex-col gap-2">
                      {spaces?.personalSpaces.map((personalSpace) => (
                        <FormField
                          key={personalSpace.publicId}
                          control={form.control}
                          name="spaces"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={personalSpace.publicId}
                                className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(
                                      personalSpace.publicId
                                    )}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            personalSpace.publicId
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) =>
                                                value !== personalSpace.publicId
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  <div className="flex w-full max-w-full flex-row items-center gap-4 truncate">
                                    <Avatar
                                      avatarProfilePublicId={
                                        personalSpace.personalSpaceOwner.profile
                                          .publicId ?? 'no_avatar'
                                      }
                                      avatarTimestamp={
                                        personalSpace.personalSpaceOwner.profile
                                          .avatarTimestamp
                                      }
                                      name={
                                        (personalSpace.personalSpaceOwner
                                          .profile?.firstName ??
                                          personalSpace.personalSpaceOwner
                                            .profile.handle ??
                                          '') +
                                        ' ' +
                                        (personalSpace.personalSpaceOwner
                                          .profile?.lastName ?? '')
                                      }
                                      color={'base'}
                                      size="md"
                                      hideTooltip
                                    />
                                    <span className="text-slate-12 h-full truncate font-medium">
                                      {(personalSpace.personalSpaceOwner.profile
                                        ?.firstName ??
                                        personalSpace.personalSpaceOwner.profile
                                          .handle ??
                                        '') +
                                        ' ' +
                                        (personalSpace.personalSpaceOwner
                                          .profile?.lastName ?? '') +
                                        "'s Personal"}
                                      Space
                                    </span>
                                  </div>
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex w-full flex-1 flex-col gap-2">
                      {spaces?.orgSpaces.map((orgSpace) => (
                        <FormField
                          key={orgSpace.publicId}
                          control={form.control}
                          name="spaces"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={orgSpace.publicId}
                                className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(
                                      orgSpace.publicId
                                    )}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            orgSpace.publicId
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) =>
                                                value !== orgSpace.publicId
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  <div className="flex w-full max-w-full flex-row items-center gap-4 truncate">
                                    <div
                                      className="flex size-6 min-h-6 min-w-6 items-center justify-center rounded-sm"
                                      style={{
                                        backgroundColor: `var(--${orgSpace.color}4)`,
                                        color: `var(--${orgSpace.color}9)`
                                      }}>
                                      <SquaresFour
                                        className="h-4 w-4"
                                        weight="bold"
                                      />
                                    </div>
                                    <span className="text-slate-12 h-full truncate font-medium">
                                      {orgSpace.name || 'Unnamed Space'}
                                    </span>
                                  </div>
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="anyoneCanSend"
            render={({ field }) => (
              <FormItem className="mb-2 flex items-center gap-4">
                <div className="mt-2 text-sm font-bold">
                  Allow everyone in the space
                  {form.watch('spaces').length > 1 ? 's' : ''} to send from this
                  address
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
          {!form.watch('anyoneCanSend') && (
            <>
              <div className="text-sm font-bold">
                Only the following people can send from this address
              </div>
              <div className="flex w-full flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex w-full flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Teams</label>
                    </div>
                    <FormField
                      control={form.control}
                      name="canSend.teams"
                      render={({ field }) => (
                        <>
                          {orgTeamsLoading && <div>Loading...</div>}
                          <MultiSelect
                            fullWidth
                            values={field.value}
                            setValues={(actionOrValue) => {
                              if (typeof actionOrValue === 'function') {
                                form.setValue(
                                  'canSend.teams',
                                  // @ts-expect-error, types are not correct
                                  actionOrValue(field.value)
                                );
                              } else {
                                form.setValue(
                                  'canSend.teams',
                                  actionOrValue as `t_${string}`[]
                                );
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
                      name="canSend.users"
                      render={({ field }) => (
                        <>
                          {orgMembersLoading && <div>Loading...</div>}
                          <MultiSelect
                            fullWidth
                            values={field.value}
                            setValues={(actionOrValue) => {
                              if (typeof actionOrValue === 'function') {
                                form.setValue(
                                  'canSend.users',
                                  // @ts-expect-error, types are not correct
                                  actionOrValue(field.value)
                                );
                              } else {
                                form.setValue(
                                  'canSend.users',
                                  actionOrValue as `om_${string}`[]
                                );
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
                    form.getFieldState('canSend').error?.message}
                </div>
              </div>
            </>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              loading={isCreatingIdentity}
              className="flex-1"
              onClick={form.handleSubmit(handleSubmit)}>
              {isCreatingIdentity ? 'Creating...' : 'Create New Email Address'}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}

const externalAddressFormSchema = z.object({
  address: z.string().email(),
  sendName: z.string().min(1, 'You must enter a send name').max(64),
  smtp: z.object({
    host: z.string().min(3).includes('.'),
    port: z.number().min(1).max(65535),
    username: z.string().min(1),
    password: z.string().min(1),
    encryption: z.enum(['none', 'ssl', 'tls', 'starttls']),
    authMethod: z.enum(['plain', 'login'])
  }),
  spaces: z.array(typeIdValidator('spaces')).min(1),
  anyoneCanSend: z.boolean(),
  canSend: z.object({
    users: z.array(typeIdValidator('orgMembers')),
    teams: z.array(typeIdValidator('teams'))
  })
});

function AddExternalEmail() {
  const orgShortcode = useOrgShortcode();
  const invalidateEmails =
    platform.useUtils().org.mail.emailIdentities.getOrgEmailIdentities;
  const invalidateUserEmails =
    platform.useUtils().org.mail.emailIdentities.getUserEmailIdentities;

  const router = useRouter();

  const { mutateAsync: checkSMTPConnection } =
    platform.org.mail.emailIdentities.external.validateExternalSmtpCredentials.useMutation(
      { onError: () => void 0 }
    );

  const { mutateAsync: createExternalEmailIdentity, isPending: isAdding } =
    platform.org.mail.emailIdentities.external.createNewExternalIdentity.useMutation(
      {
        onSuccess: () => {
          form.reset();
          void invalidateEmails.invalidate();
        },
        onError: (e) => {
          toast.error("Couldn't verify SMTP Credentials", {
            description: e.message
          });
        }
      }
    );

  const form = useForm<z.infer<typeof externalAddressFormSchema>>({
    resolver: zodResolver(externalAddressFormSchema),

    defaultValues: {
      address: '',
      sendName: '',
      smtp: {
        host: '',
        port: 25,
        username: '',
        password: '',
        encryption: 'none',
        authMethod: 'plain'
      },
      spaces: [],
      anyoneCanSend: true,
      canSend: {
        users: [] as TypeId<'orgMembers'>[],
        teams: [] as TypeId<'teams'>[]
      }
    }
  });

  const { data: spaces, isLoading: spacesLoading } =
    platform.spaces.getAllOrgSpacesWithPersonalSeparately.useQuery({
      orgShortcode
    });

  const { data: orgMembers, isLoading: orgMembersLoading } =
    platform.org.users.members.getOrgMembers.useQuery({
      orgShortcode
    });

  const { data: orgTeams, isLoading: orgTeamsLoading } =
    platform.org.users.teams.getOrgTeams.useQuery({ orgShortcode });

  const handleSubmit = async (
    values: z.infer<typeof externalAddressFormSchema>
  ) => {
    if (
      values.anyoneCanSend === false &&
      values.canSend.teams.length === 0 &&
      values.canSend.users.length === 0
    ) {
      form.setError('canSend', {
        message: 'You must select at least one team or user'
      });
      return;
    }

    const smtpValid = await checkSMTPConnection({
      orgShortcode,
      ...values.smtp
    })
      .then((e) => e.valid)
      .catch(() => false);

    if (!smtpValid) {
      toast.error('SMTP Connection Failed, Please check your credentials');
      return;
    }

    await createExternalEmailIdentity({
      orgShortcode,
      emailAddress: values.address,
      sendName: values.sendName,
      smtp: values.smtp,
      routeToSpacesPublicIds: values.spaces,
      canSend: {
        anyone: values.anyoneCanSend,
        users: values.canSend.users,
        teams: values.canSend.teams
      }
    });

    await invalidateUserEmails.invalidate();
    await invalidateEmails.invalidate();

    router.push(`/${orgShortcode}/settings/org/mail/addresses`);
  };

  return (
    <div>
      <Form {...form}>
        <div className="my-2 flex w-full flex-col gap-2">
          {/* {JSON.stringify(spaces)} */}
          <div className="text-sm font-bold">External Email Address</div>
          <div className="grid w-full grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      fullWidth
                      label="Full Email Address"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sendName"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      fullWidth
                      label="Send Name"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Separator className="my-2" />

          <div className="flex w-full flex-col gap-2">
            <div className="text-sm font-bold">SMTP Settings</div>
            <div className="grid w-full grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="smtp.host"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        fullWidth
                        label="SMTP Hostname"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtp.port"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        fullWidth
                        label="SMTP Port"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid w-full grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="smtp.username"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        fullWidth
                        label="SMTP Username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtp.password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PasswordInput
                        fullWidth
                        label="SMTP Password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="smtp.encryption"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Encryption</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(
                          value as 'none' | 'ssl' | 'tls' | 'starttls'
                        )
                      }>
                      <FormControl>
                        <SelectTrigger className="w-full flex-1 uppercase">
                          <SelectValue className="flex w-full px-2">
                            {field.value ?? 'Select Encryption'}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="starttls">STARTTLS</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtp.authMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auth Method</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value as 'plain' | 'login')
                      }>
                      <FormControl>
                        <SelectTrigger className="w-full flex-1 capitalize">
                          <SelectValue className="flex w-full px-2">
                            {field.value ?? 'Select Login Method'}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="plain">Plain</SelectItem>
                          <SelectItem value="login">Login</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="text-sm font-bold">
            Deliver messages to the following Spaces
          </div>
          <div className="flex w-full flex-1 flex-col gap-1">
            <FormField
              control={form.control}
              name="spaces"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Spaces</FormLabel>
                    <FormDescription>
                      Deliver messages to the following Spaces
                    </FormDescription>
                  </div>
                  {spacesLoading && <div>Loading...</div>}
                  <div className="flex w-full flex-1 flex-col gap-2">
                    <div className="flex w-full flex-1 flex-col gap-2">
                      {spaces?.personalSpaces.map((personalSpace) => (
                        <FormField
                          key={personalSpace.publicId}
                          control={form.control}
                          name="spaces"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={personalSpace.publicId}
                                className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(
                                      personalSpace.publicId
                                    )}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            personalSpace.publicId
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) =>
                                                value !== personalSpace.publicId
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  <div className="flex w-full max-w-full flex-row items-center gap-4 truncate">
                                    <Avatar
                                      avatarProfilePublicId={
                                        personalSpace.personalSpaceOwner.profile
                                          .publicId ?? 'no_avatar'
                                      }
                                      avatarTimestamp={
                                        personalSpace.personalSpaceOwner.profile
                                          .avatarTimestamp
                                      }
                                      name={
                                        (personalSpace.personalSpaceOwner
                                          .profile?.firstName ??
                                          personalSpace.personalSpaceOwner
                                            .profile.handle ??
                                          '') +
                                        ' ' +
                                        (personalSpace.personalSpaceOwner
                                          .profile?.lastName ?? '')
                                      }
                                      color={'base'}
                                      size="md"
                                      hideTooltip
                                    />
                                    <span className="text-slate-12 h-full truncate font-medium">
                                      {(personalSpace.personalSpaceOwner.profile
                                        ?.firstName ??
                                        personalSpace.personalSpaceOwner.profile
                                          .handle ??
                                        '') +
                                        ' ' +
                                        (personalSpace.personalSpaceOwner
                                          .profile?.lastName ?? '') +
                                        "'s Personal"}
                                      Space
                                    </span>
                                  </div>
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex w-full flex-1 flex-col gap-2">
                      {spaces?.orgSpaces.map((orgSpace) => (
                        <FormField
                          key={orgSpace.publicId}
                          control={form.control}
                          name="spaces"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={orgSpace.publicId}
                                className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(
                                      orgSpace.publicId
                                    )}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([
                                            ...field.value,
                                            orgSpace.publicId
                                          ])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) =>
                                                value !== orgSpace.publicId
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  <div className="flex w-full max-w-full flex-row items-center gap-4 truncate">
                                    <div
                                      className="flex size-6 min-h-6 min-w-6 items-center justify-center rounded-sm"
                                      style={{
                                        backgroundColor: `var(--${orgSpace.color}4)`,
                                        color: `var(--${orgSpace.color}9)`
                                      }}>
                                      <SquaresFour
                                        className="h-4 w-4"
                                        weight="bold"
                                      />
                                    </div>
                                    <span className="text-slate-12 h-full truncate font-medium">
                                      {orgSpace.name || 'Unnamed Space'}
                                    </span>
                                  </div>
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="anyoneCanSend"
            render={({ field }) => (
              <FormItem className="mb-2 flex items-center gap-4">
                <div className="mt-2 text-sm font-bold">
                  Allow everyone in the space
                  {form.watch('spaces').length > 1 ? 's' : ''} to send from this
                  address
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
          {!form.watch('anyoneCanSend') && (
            <>
              <div className="text-sm font-bold">
                Only the following people can send from this address
              </div>
              <div className="flex w-full flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex w-full flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Teams</label>
                    </div>
                    <FormField
                      control={form.control}
                      name="canSend.teams"
                      render={({ field }) => (
                        <>
                          {orgTeamsLoading && <div>Loading...</div>}
                          <MultiSelect
                            fullWidth
                            values={field.value}
                            setValues={(actionOrValue) => {
                              if (typeof actionOrValue === 'function') {
                                form.setValue(
                                  'canSend.teams',
                                  // @ts-expect-error, types are not correct
                                  actionOrValue(field.value)
                                );
                              } else {
                                form.setValue(
                                  'canSend.teams',
                                  actionOrValue as `t_${string}`[]
                                );
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
                      name="canSend.users"
                      render={({ field }) => (
                        <>
                          {orgMembersLoading && <div>Loading...</div>}
                          <MultiSelect
                            fullWidth
                            values={field.value}
                            setValues={(actionOrValue) => {
                              if (typeof actionOrValue === 'function') {
                                form.setValue(
                                  'canSend.users',
                                  // @ts-expect-error, types are not correct
                                  actionOrValue(field.value)
                                );
                              } else {
                                form.setValue(
                                  'canSend.users',
                                  actionOrValue as `om_${string}`[]
                                );
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
                {/* <div className="text-red-10 text-sm">
                  {emailIdentityError?.message ??
                    form.getFieldState('canSend').error?.message}
                </div> */}
              </div>
            </>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              loading={isAdding || form.formState.isSubmitting}
              onClick={form.handleSubmit(handleSubmit)}>
              {isAdding ? 'Adding...' : 'Add External Email'}
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}
