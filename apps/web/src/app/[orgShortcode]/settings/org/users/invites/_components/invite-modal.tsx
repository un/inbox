'use client';

import { platform } from '@/src/lib/trpc';
import { useGlobalStore } from '@/src/providers/global-store-provider';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

const inviteFormSchema = z.object({
  firstName: z.string().min(1).max(64),
  lastName: z.string().min(0).max(64),
  role: z.enum(['member', 'admin']),
  title: z.string().min(0).max(64),
  invite: z.object({
    sendInvite: z.boolean(),
    email: z.string().min(1).email().optional()
  }),
  email: z.object({
    create: z.boolean(),
    address: z
      .string()
      .min(1)
      .max(32)
      .regex(/^[a-zA-Z0-9._-]*$/, {
        message: 'Only letters and numbers'
      })
      .optional(),
    domain: z.string().min(1, 'You must select a domain').optional(),
    sendName: z.string().min(1, 'You must enter a send name').max(64).optional()
  }),
  team: z.object({
    addToTeams: z.boolean(),
    teams: z.array(z.string())
  })
});

export function InviteModal() {
  const [open, setOpen] = useState(false);
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const invalidateInvites = platform.useUtils().org.users.invites.viewInvites;

  const {
    mutateAsync: createInvite,
    error: inviteError,
    isPending: isSubmitting
  } = platform.org.users.invites.createNewInvite.useMutation({
    onSuccess: () => {
      void invalidateInvites.invalidate();
      setOpen(false);
    }
  });

  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      role: 'member',
      title: '',
      invite: {
        sendInvite: false,
        email: ''
      },
      email: {
        create: false,
        address: '',
        domain: '',
        sendName: ''
      },
      team: {
        addToTeams: false,
        teams: []
      }
    }
  });

  const handleSubmit = async (values: z.infer<typeof inviteFormSchema>) => {
    await createInvite({
      orgShortcode,
      newOrgMember: {
        firstName: values.firstName,
        lastName: values.lastName.length ? values.lastName : undefined,
        role: values.role,
        title: values.title.length ? values.title : undefined
      },
      email: values.email.create
        ? {
            emailUsername: values.email.address!,
            domainPublicId: values.email.domain!,
            sendName: values.email.sendName!
          }
        : undefined,
      notification: values.invite.sendInvite
        ? { notificationEmailAddress: values.invite.email! }
        : undefined,
      teams: values.team.addToTeams
        ? { teamsPublicIds: values.team.teams }
        : undefined
    });
    form.reset();
  };

  const { data: orgDomains, isLoading: orgDomainsLoading } =
    platform.org.mail.domains.getOrgDomains.useQuery({
      orgShortcode
    });

  const { data: orgTeams, isLoading: orgTeamsLoading } =
    platform.org.users.teams.getOrgTeams.useQuery({ orgShortcode });

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (form.formState.isSubmitting) return;
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
        <div className="my-2 flex flex-col gap-2">
          <Form {...form}>
            <div className="flex w-full gap-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        fullWidth
                        label="First Name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        fullWidth
                        label="Last Name (Optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex w-full gap-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <Select
                      name={field.name}
                      value={field.value}
                      onValueChange={(e: 'member' | 'admin') =>
                        field.onChange(e)
                      }>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        fullWidth
                        label="Title (Optional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="mt-1 flex w-full flex-col gap-2">
              <FormField
                control={form.control}
                name="invite.sendInvite"
                render={({ field }) => (
                  <FormItem className="mb-2 flex items-center gap-4">
                    <div className="mt-2 text-sm font-bold">
                      Send Invitation via Email
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

              {form.watch('invite.sendInvite') && (
                <FormField
                  control={form.control}
                  name="invite.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          fullWidth
                          label="Invite Email Address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            <div className="mt-1 flex w-full flex-col gap-2">
              <FormField
                control={form.control}
                name="email.create"
                render={({ field }) => (
                  <FormItem className="mb-2 flex items-center gap-4">
                    <div className="mt-2 text-sm font-bold">
                      Create an Address for the User
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

              {form.watch('email.create') && (
                <>
                  {orgDomainsLoading && <div>Loading...</div>}
                  {orgDomains && (
                    <>
                      <div className="flex gap-1">
                        <FormField
                          control={form.control}
                          name="email.address"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  fullWidth
                                  label="Email Username"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <span className="flex items-center">@</span>
                        <FormField
                          control={form.control}
                          name="email.domain"
                          render={({ field }) => (
                            <FormItem>
                              <Select
                                name={field.name}
                                value={field.value}
                                onValueChange={(e: TypeId<'domains'>) =>
                                  field.onChange(e)
                                }>
                                <FormControl>
                                  <SelectTrigger className="w-full flex-1">
                                    <SelectValue placeholder="Select domain" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
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
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="email.sendName"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                fullWidth
                                label="Send Name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </>
              )}
            </div>
            <div className="mt-4 flex w-full flex-col gap-2">
              <FormField
                control={form.control}
                name="team.addToTeams"
                render={({ field }) => (
                  <FormItem className="mb-2 flex items-center gap-4">
                    <div className="mt-2 text-sm font-bold">
                      Add User to Teams
                    </div>
                    <FormControl>
                      {orgTeams?.teams && orgTeams?.teams?.length > 0 ? (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      ) : (
                        <Tooltip>
                          <TooltipTrigger>
                            <Switch
                              disabled
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{`You don't have any teams`}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('team.addToTeams') && (
                <>
                  {orgTeamsLoading && <div>Loading...</div>}
                  {orgTeams && (
                    <FormField
                      control={form.control}
                      name="team.teams"
                      render={({ field }) => (
                        <FormItem className="flex flex-col gap-1">
                          <FormControl>
                            <MultiSelect
                              values={field.value}
                              setValues={(actionOrValue) => {
                                if (typeof actionOrValue === 'function') {
                                  form.setValue(
                                    'team.teams',
                                    actionOrValue(field.value)
                                  );
                                } else {
                                  form.setValue('team.teams', actionOrValue);
                                }
                              }}
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
                                      backgroundColor: `var(--${item.color}10)`
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
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}

              <div className="text-red-10">{inviteError?.message}</div>

              <div className="flex flex-wrap gap-2">
                <DialogClose asChild>
                  <Button
                    className="flex-1"
                    disabled={isSubmitting}
                    variant={'secondary'}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  loading={isSubmitting}
                  className="flex-1"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const values = form.getValues();

                    // We need to make the fields optional if they are not being used

                    if (!values.invite.sendInvite) {
                      form.setValue('invite.email', undefined);
                    }

                    if (!values.email.create) {
                      form.setValue('email.address', undefined);
                      form.setValue('email.domain', undefined);
                      form.setValue('email.sendName', undefined);
                    }

                    if (values.team.addToTeams && !values.team.teams.length) {
                      form.setError('team.teams', {
                        message: 'You must select at least one team'
                      });
                      return;
                    }

                    await form.handleSubmit(handleSubmit)(e);
                  }}>
                  {isSubmitting ? 'Creating...' : 'Create New Invite'}
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
