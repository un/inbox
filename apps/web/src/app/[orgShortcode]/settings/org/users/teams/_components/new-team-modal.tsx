'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
  DialogClose
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
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/src/components/shadcn-ui/form';
import { useGlobalStore } from '@/src/providers/global-store-provider';
import { type UiColor, uiColors } from '@u22n/utils/colors';
import { Switch } from '@/src/components/shadcn-ui/switch';
import { Button } from '@/src/components/shadcn-ui/button';
import { Input } from '@/src/components/shadcn-ui/input';
import { At, SpinnerGap } from '@phosphor-icons/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type TypeId } from '@u22n/utils/typeid';
import { useForm } from 'react-hook-form';
import { platform } from '@/src/lib/trpc';
import { useState } from 'react';
import { z } from 'zod';

const teamFormSchema = z.object({
  teamName: z.string().min(2, 'Team name must be at least 2 characters'),
  description: z.string(),
  color: z.enum(uiColors),
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
  })
});

export function NewTeamModal() {
  const [open, setOpen] = useState(false);
  const orgShortcode = useGlobalStore((state) => state.currentOrg.shortcode);
  const invalidateTeams = platform.useUtils().org.users.teams.getOrgTeams;

  const utils = platform.useUtils();
  const checkEmailAvailability =
    utils.org.mail.emailIdentities.checkEmailAvailability;

  const [formError, setFormError] = useState<string | null>(null);

  const { data: canAddTeam, isLoading } = platform.org.iCanHaz.team.useQuery(
    {
      orgShortcode: orgShortcode
    },
    {
      staleTime: 1000
    }
  );

  const {
    mutateAsync: createTeam,
    error: teamError,
    isPending: isCreatingTeam
  } = platform.org.users.teams.createTeam.useMutation({
    onSuccess: () => {
      void invalidateTeams.invalidate();
    }
  });

  const {
    mutateAsync: createEmailIdentity,
    error: emailError,
    isPending: isCreatingEmailIdentity
  } = platform.org.mail.emailIdentities.createNewEmailIdentity.useMutation();

  const form = useForm<z.infer<typeof teamFormSchema>>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      teamName: '',
      description: '',
      color: 'red',
      email: {
        create: false,
        address: '',
        domain: '',
        sendName: ''
      }
    }
  });

  const handleSubmit = async (values: z.infer<typeof teamFormSchema>) => {
    if (values.email.create) {
      const emailAvailable = await checkEmailAvailability.fetch({
        orgShortcode,
        emailUsername: values.email.address!,
        domainPublicId: values.email.domain!
      });
      if (!emailAvailable.available) {
        setFormError('This is email is not available or is already in use');
        return;
      }
    }

    const team = await createTeam({
      orgShortcode,
      teamName: values.teamName,
      teamColor: values.color,
      teamDescription: values.description ?? undefined
    });

    if (values.email.create) {
      await createEmailIdentity({
        orgShortcode,
        domainPublicId: values.email.domain!,
        emailUsername: values.email.address!,
        sendName: values.email.sendName!,
        catchAll: false,
        routeToTeamsPublicIds: [team.newTeamPublicId]
      });
    }

    form.reset();
    setOpen(false);
  };

  const { data: orgDomains, isLoading: orgDomainsLoading } =
    platform.org.mail.domains.getOrgDomains.useQuery({
      orgShortcode
    });

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        if (form.formState.isSubmitting) return;
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
          <div className="flex w-full justify-center gap-2 text-center font-bold">
            <SpinnerGap
              className="size-4 animate-spin"
              size={16}
            />
            Loading...
          </div>
        ) : !canAddTeam ? (
          <div>
            Your Current Billing Plan does not allow you to create Teams
          </div>
        ) : (
          <div className="my-2 flex flex-col gap-2">
            <Form {...form}>
              <div className="flex w-full gap-2">
                <FormField
                  control={form.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          fullWidth
                          label="Team Name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          fullWidth
                          label="Description"
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
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Select
                          name={field.name}
                          value={field.value}
                          onValueChange={(e: UiColor) => field.onChange(e)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            id={field.name}
                            onBlur={field.onBlur}>
                            <SelectGroup>
                              {uiColors.map((color) => (
                                <SelectItem
                                  value={color}
                                  key={color}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-4 w-4 rounded-full"
                                      style={{
                                        backgroundColor: `var(--${color}10)`
                                      }}
                                    />
                                    <div className="capitalize">{color}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-4 flex w-full flex-col gap-2">
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
                          <span className="my-[10px] flex items-start">
                            <At
                              className="size-4"
                              weight="bold"
                            />
                          </span>
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
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select domain" />
                                  </SelectTrigger>
                                  <SelectContent
                                    id={field.name}
                                    onBlur={field.onBlur}>
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

              <div className="mt-1 flex w-full flex-col gap-2">
                <div className="text-red-10">
                  {formError ?? teamError?.message ?? emailError?.message}
                </div>

                <div className="flex flex-wrap gap-2">
                  <DialogClose asChild>
                    <Button
                      className="flex-1"
                      disabled={isCreatingTeam || isCreatingEmailIdentity}>
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    loading={
                      isCreatingTeam ||
                      isCreatingEmailIdentity ||
                      form.formState.isSubmitting
                    }
                    className="flex-1"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const values = form.getValues();

                      // We need to make the fields optional if they are not being used
                      if (!values.email.create) {
                        form.setValue('email.address', undefined);
                        form.setValue('email.domain', undefined);
                        form.setValue('email.sendName', undefined);
                      }

                      await form.handleSubmit(handleSubmit)(e);
                    }}>
                    {isCreatingTeam || isCreatingEmailIdentity
                      ? 'Creating...'
                      : 'Create New Team'}
                  </Button>
                </div>
              </div>
            </Form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
