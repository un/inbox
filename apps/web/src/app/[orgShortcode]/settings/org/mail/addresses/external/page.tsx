'use client';

import { platform } from '@/src/lib/trpc';
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
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';

export default function Page() {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const invalidateEmails =
    platform.useUtils().org.mail.emailIdentities.getOrgEmailIdentities;
  const { mutateAsync: checkSMTPConnection } =
    platform.org.mail.emailIdentities.external.validateExternalSmtpCredentials.useMutation();

  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const {
    mutateAsync: createExternalEmailIdentity,
    error: emailIdentityError
  } =
    platform.org.mail.emailIdentities.external.createNewExternalIdentity.useMutation(
      {
        onSuccess: () => {
          void invalidateEmails.invalidate();
          router.push('./');
        }
      }
    );

  const form = useForm({
    defaultValues: {
      fullEmail: '',
      sendName: '',
      smtp: {
        host: '',
        port: 25,
        username: '',
        password: '',
        encryption: 'none' as 'none' | 'ssl' | 'tls' | 'starttls',
        authMethod: 'plain' as 'plain' | 'login'
      },
      deliversTo: {
        users: [] as TypeId<'orgMembers'>[],
        teams: [] as TypeId<'teams'>[]
      }
    },
    validatorAdapter: zodValidator,
    onSubmit: async ({ value }) => {
      const smtpValid = await checkSMTPConnection({
        orgShortcode,
        ...value.smtp
      })
        .then((e) => e.valid)
        .catch(() => false);

      if (!smtpValid) {
        setError('SMTP Connection Failed, Please check your credentials');
        return;
      }

      await createExternalEmailIdentity({
        orgShortcode,
        sendName: value.sendName,
        emailAddress: value.fullEmail,
        smtp: value.smtp,
        routeToOrgMemberPublicIds:
          value.deliversTo.users.length > 0
            ? value.deliversTo.users
            : undefined,
        routeToTeamsPublicIds:
          value.deliversTo.teams.length > 0 ? value.deliversTo.teams : undefined
      }).catch(() => null);
    }
  });

  const { data: orgMembers, isLoading: orgMembersLoading } =
    platform.org.users.members.getOrgMembers.useQuery({
      orgShortcode
    });

  const { data: orgTeams, isLoading: orgTeamsLoading } =
    platform.org.users.teams.getOrgTeams.useQuery({ orgShortcode });

  return (
    <div className="flex w-full flex-col gap-2 p-4">
      <div className="flex w-full gap-4 py-2">
        <Button
          asChild
          size="icon"
          variant="outline">
          <Link href="./">
            <ArrowLeft className="size-6" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center">
          <h1 className="font-display text-2xl leading-5">
            Add External Email
          </h1>
        </div>
      </div>
      <div className="flex w-full flex-col justify-between">
        <form
          className="my-2 flex w-full flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void form.handleSubmit();
          }}>
          <div className="flex w-fit flex-col gap-2">
            <div className="text-muted-foreground font-bold uppercase">
              Email Address
            </div>
            <div className="flex gap-1">
              <form.Field
                name="fullEmail"
                validators={{
                  onBlur: z.string().email()
                }}
                children={(field) => (
                  <div className="flex flex-col">
                    <Input
                      className="w-fit"
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="hello@example.com"
                    />
                    {field.state.meta.errorMap.onBlur && (
                      <span className="text-red-10">
                        {field.state.meta.errorMap.onBlur}
                      </span>
                    )}
                  </div>
                )}
              />
              <form.Field
                name="sendName"
                validators={{ onBlur: z.string().min(1).max(64) }}
                children={(field) => (
                  <div className="flex flex-col">
                    <Input
                      id={field.name}
                      className="w-fit"
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
                  </div>
                )}
              />
            </div>
          </div>

          <div className="flex w-fit flex-col gap-2">
            <div className="text-muted-foreground font-bold uppercase">
              SMTP Settings
            </div>
            <div className="flex gap-1">
              <form.Field
                name="smtp.host"
                validators={{
                  onBlur: z.string().min(3).includes('.')
                }}
                children={(field) => (
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">
                      SMTP Host
                    </span>
                    <Input
                      className="w-fit"
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="hostname"
                    />
                  </div>
                )}
              />
              <form.Field
                name="smtp.port"
                validators={{ onBlur: z.number().min(1).max(65535) }}
                children={(field) => (
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">
                      SMTP Port
                    </span>
                    <Input
                      id={field.name}
                      type="number"
                      className="w-fit"
                      name={field.name}
                      value={field.state.value ?? ''}
                      onChange={(e) =>
                        field.handleChange(e.target.valueAsNumber)
                      }
                      onBlur={field.handleBlur}
                      placeholder="port"
                    />
                  </div>
                )}
              />
            </div>
            <div className="flex gap-1">
              <form.Field
                name="smtp.username"
                validators={{
                  onBlur: z.string().min(1)
                }}
                children={(field) => (
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">
                      Username
                    </span>
                    <Input
                      className="w-fit"
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="username"
                    />
                  </div>
                )}
              />
              <form.Field
                name="smtp.password"
                validators={{ onBlur: z.string().min(1) }}
                children={(field) => (
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">
                      Password
                    </span>
                    <Input
                      id={field.name}
                      className="w-fit"
                      name={field.name}
                      value={field.state.value ?? ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="password"
                    />
                  </div>
                )}
              />
            </div>
            <div className="flex w-fit gap-1">
              <form.Field
                name="smtp.encryption"
                children={(field) => (
                  <div className="flex w-full flex-1 flex-col">
                    <span className="text-muted-foreground text-xs">
                      Encryption
                    </span>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(
                          value as 'none' | 'ssl' | 'tls' | 'starttls'
                        )
                      }>
                      <SelectTrigger className="w-full flex-1 uppercase">
                        <SelectValue className="flex w-full px-2">
                          {field.state.value ?? 'Select Encryption'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="ssl">SSL</SelectItem>
                          <SelectItem value="tls">TLS</SelectItem>
                          <SelectItem value="starttls">STARTTLS</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
              <form.Field
                name="smtp.authMethod"
                children={(field) => (
                  <div className="flex w-full flex-1 flex-col">
                    <span className="text-muted-foreground text-xs">
                      Auth Method
                    </span>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) =>
                        field.handleChange(value as 'plain' | 'login')
                      }>
                      <SelectTrigger className="w-full flex-1 capitalize">
                        <SelectValue className="flex w-full px-2">
                          {field.state.value ?? 'Select Login Method'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="plain">Plain</SelectItem>
                          <SelectItem value="login">Login</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>
          </div>

          <div className="text-muted-foreground font-bold uppercase">
            Deliver Messages To
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="flex flex-col gap-1">
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
            <div className="text-red-10">{error}</div>
            <div className="mt-2 flex w-fit flex-wrap gap-2">
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
                  >
                    {isSubmitting ? 'Adding...' : 'Add External Email'}
                  </Button>
                )}
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
