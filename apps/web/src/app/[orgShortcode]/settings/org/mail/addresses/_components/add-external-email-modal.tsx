'use client';

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
  FormLabel,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/src/components/shadcn-ui/dialog';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { MultiSelect } from '@/src/components/shared/multiselect';
import { PasswordInput } from '@/src/components/password-input';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { toast } from 'sonner';
import { z } from 'zod';

const externalEmailFormSchema = z.object({
  fullEmail: z.string().email(),
  sendName: z.string().min(1).max(64),
  smtp: z.object({
    host: z.string().min(3).includes('.'),
    port: z.number().min(1).max(65535),
    username: z.string().min(1),
    password: z.string().min(1),
    encryption: z.enum(['none', 'ssl', 'tls', 'starttls']),
    authMethod: z.enum(['plain', 'login'])
  }),
  deliversTo: z.object({
    users: z.string().array(),
    teams: z.string().array()
  })
});

export function ExternalEmailModal({
  open,
  addExternalModalOpen
}: {
  addExternalModalOpen: (value: boolean) => void;
  open: boolean;
}) {
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const invalidateEmails =
    platform.useUtils().org.mail.emailIdentities.getOrgEmailIdentities;
  const { mutateAsync: checkSMTPConnection } =
    platform.org.mail.emailIdentities.external.validateExternalSmtpCredentials.useMutation(
      { onError: () => void 0 }
    );

  const router = useRouter();

  const { mutate: createExternalEmailIdentity, isPending: isAdding } =
    platform.org.mail.emailIdentities.external.createNewExternalIdentity.useMutation(
      {
        onSuccess: () => {
          form.reset();
          void invalidateEmails.invalidate();
          router.push('./');
        },
        onError: (e) => {
          toast.error("Couldn't verify SMTP Credentials", {
            description: e.message
          });
        }
      }
    );

  const form = useForm<z.infer<typeof externalEmailFormSchema>>({
    resolver: zodResolver(externalEmailFormSchema),
    defaultValues: {
      fullEmail: '',
      sendName: '',
      smtp: {
        host: '',
        port: 25,
        username: '',
        password: '',
        encryption: 'none',
        authMethod: 'plain'
      },
      deliversTo: {
        users: [],
        teams: []
      }
    }
  });

  const { data: orgMembers, isLoading: orgMembersLoading } =
    platform.org.users.members.getOrgMembers.useQuery({
      orgShortcode
    });

  const { data: orgTeams, isLoading: orgTeamsLoading } =
    platform.org.users.teams.getOrgTeams.useQuery({ orgShortcode });

  const handleSubmit = async (
    value: z.infer<typeof externalEmailFormSchema>
  ) => {
    if (
      value.deliversTo.users.length === 0 &&
      value.deliversTo.teams.length === 0
    ) {
      toast.error('You need to add at least 1 user or team');
      return;
    }
    const smtpValid = await checkSMTPConnection({
      orgShortcode,
      ...value.smtp
    })
      .then((e) => e.valid)
      .catch(() => false);

    if (!smtpValid) {
      toast.error('SMTP Connection Failed, Please check your credentials');
      return;
    }

    createExternalEmailIdentity({
      orgShortcode,
      sendName: value.sendName,
      emailAddress: value.fullEmail,
      smtp: value.smtp,
      routeToOrgMemberPublicIds:
        value.deliversTo.users.length > 0 ? value.deliversTo.users : undefined,
      routeToTeamsPublicIds:
        value.deliversTo.teams.length > 0 ? value.deliversTo.teams : undefined
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (form.formState.isSubmitting) return;
        addExternalModalOpen(!open);
      }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add External Email</DialogTitle>
        </DialogHeader>

        <div className="flex w-full flex-col justify-between">
          <Form {...form}>
            <div className="my-2 flex w-full flex-col gap-2">
              <div className="flex w-full flex-col gap-2">
                <div className="text-sm font-bold">Email Address</div>
                <div className="grid w-full grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="fullEmail"
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
              </div>

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

              <div className="text-muted-foreground font-bold uppercase">
                Deliver Messages To
              </div>
              <div className="flex flex-col gap-2">
                <div className="grid w-full grid-cols-2 gap-2">
                  <div className="flex w-full flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-bold">Teams</label>
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
                                form.setValue(
                                  'deliversTo.users',
                                  actionOrValue
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
                  <div className="flex w-full flex-1 flex-col gap-1">
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
                                form.setValue(
                                  'deliversTo.users',
                                  actionOrValue
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

                <div className="mt-2 grid w-full grid-cols-2 gap-2">
                  <DialogClose asChild>
                    <Button
                      variant="secondary"
                      className="flex-1">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    loading={isAdding || form.formState.isSubmitting}
                    onClick={form.handleSubmit(handleSubmit)}>
                    {isAdding ? 'Adding...' : 'Add External Email'}
                  </Button>
                </div>
              </div>
            </div>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
