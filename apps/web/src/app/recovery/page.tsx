// 'use client';

// import { Button } from '@/src/components/shadcn-ui/button';
// import { Input } from '@/src/components/shadcn-ui/input';
// import {
//   Tabs,
//   TabsList,
//   TabsContent,
//   TabsTrigger
// } from '@/src/components/shadcn-ui/tabs';
// import {
//   InputOTP,
//   InputOTPGroup,
//   InputOTPSlot
// } from '@/src/components/shadcn-ui/input-otp';
// import { type FieldApi, useForm } from '@tanstack/react-form';
// import { zodValidator } from '@tanstack/zod-form-adapter';
// import { zodSchemas } from '@u22n/utils/zodSchemas';
// import { platform } from '@/src/lib/trpc';
// import { z } from 'zod';
// import useAwaitableModal from '@/src/hooks/use-awaitable-modal';
// import { useRouter } from 'next/navigation';
// import { toast } from 'sonner';
// import { PasswordRecoveryModal, TwoFactorModal } from './_components/modals';
// import {
//   TurnstileComponent,
//   turnstileEnabled
// } from '@/src/components/turnstile';

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// function FieldInfo({ field }: { field: FieldApi<any, any, any, any> }) {
//   return (
//     <>
//       {field.state.meta.touchedErrors ? (
//         <em>{field.state.meta.touchedErrors}</em>
//       ) : null}
//       {field.state.meta.isValidating ? 'Checking...' : null}
//     </>
//   );
// }

// export default function Page() {
//   const recoveryVerificationTokenApi =
//     platform.useUtils().auth.recovery.getRecoveryVerificationToken;

//   const router = useRouter();

//   const [PasswordModalRoot, openPasswordModal] = useAwaitableModal(
//     PasswordRecoveryModal,
//     {
//       accountPublicId: 'a_'
//     }
//   );

//   const [TOTPModalRoot, openTOTPModal] = useAwaitableModal(TwoFactorModal, {
//     uri: '',
//     accountPublicId: 'a_'
//   });

//   const form = useForm({
//     defaultValues: {
//       username: '',
//       password: '',
//       twoFactorCode: '',
//       recoveryCode: '',
//       recoveryType: 'password',
//       turnstileToken: undefined as string | undefined
//     },
//     onSubmit: async ({ value }) => {
//       if (value.recoveryType === 'password') {
//         const data = await recoveryVerificationTokenApi
//           .fetch({
//             username: value.username,
//             twoFactorCode: value.twoFactorCode,
//             recoveryCode: value.recoveryCode,
//             turnstileToken: value.turnstileToken
//           })
//           .catch((err: Error) => {
//             toast.error(err.message);
//           });
//         if (!data) return;

//         await openPasswordModal({ accountPublicId: data.accountPublicId });
//         toast.success(
//           'Your Password has been reset. Login using your new password and setup a new Recovery Code.'
//         );
//         router.push('/');
//       } else {
//         const data = await recoveryVerificationTokenApi
//           .fetch({
//             username: value.username,
//             password: value.password,
//             recoveryCode: value.recoveryCode
//           })
//           .catch((err: Error) => {
//             toast.error(err.message);
//           });
//         if (!data) return;

//         await openTOTPModal({
//           uri: data.uri,
//           accountPublicId: data.accountPublicId
//         });
//         toast.success(
//           'Your 2FA has been reset. Login using your new 2FA and setup a new Recovery Code.'
//         );
//         router.push('/');
//       }
//     },
//     validatorAdapter: zodValidator
//   });
//   return (
//     <form
//       className="flex h-full items-center justify-center"
//       onSubmit={(e) => {
//         e.preventDefault();
//         e.stopPropagation();
//         void form.handleSubmit();
//       }}>
//       <div className="bg-card flex w-full max-w-96 flex-col gap-2 border p-4">
//         <h1 className="text-center text-xl font-bold">
//           Recover Your Credentials
//         </h1>
//         <div className="flex flex-col gap-1">
//           <label
//             htmlFor="username"
//             className="text-xs font-bold">
//             Username
//           </label>
//           <form.Field
//             name="username"
//             validators={{ onBlur: zodSchemas.username(2) }}
//             children={(field) => (
//               <>
//                 <Input
//                   id="username"
//                   name={field.name}
//                   value={field.state.value}
//                   onChange={(e) => field.handleChange(e.target.value)}
//                   onBlur={field.handleBlur}
//                 />
//                 <FieldInfo field={field} />
//               </>
//             )}
//           />
//         </div>
//         <form.Field
//           name="recoveryType"
//           children={({ state, handleChange }) => (
//             <Tabs
//               value={state.value}
//               onValueChange={handleChange}>
//               <TabsList className="w-full">
//                 <TabsTrigger
//                   className="flex-1 p-1"
//                   value="password">
//                   Recover Password
//                 </TabsTrigger>
//                 <TabsTrigger
//                   className="flex-1 p-1"
//                   value="two-fa">
//                   Recover 2FA
//                 </TabsTrigger>
//               </TabsList>
//               <TabsContent
//                 value="password"
//                 className="py-4">
//                 <div className="mx-auto flex w-fit flex-col gap-1">
//                   <label
//                     htmlFor="known-two-fa"
//                     className="text-xs font-bold">
//                     2FA Code
//                   </label>
//                   <form.Field
//                     name="twoFactorCode"
//                     validators={{
//                       onSubmit: z
//                         .string()
//                         .min(6, { message: '2FA Code must be 6 digits' })
//                     }}
//                     children={(field) => (
//                       <>
//                         <InputOTP
//                           id="known-two-fa"
//                           name={field.name}
//                           maxLength={6}
//                           value={field.state.value}
//                           onChange={(e) => field.handleChange(e)}>
//                           <InputOTPGroup className="w-fit justify-center gap-2">
//                             <InputOTPSlot
//                               index={0}
//                               className="rounded-md border"
//                             />
//                             <InputOTPSlot
//                               index={1}
//                               className="rounded-md border"
//                             />
//                             <InputOTPSlot
//                               index={2}
//                               className="rounded-md border"
//                             />
//                             <InputOTPSlot
//                               index={3}
//                               className="rounded-md border"
//                             />
//                             <InputOTPSlot
//                               index={4}
//                               className="rounded-md border"
//                             />
//                             <InputOTPSlot
//                               index={5}
//                               className="rounded-md border"
//                             />
//                           </InputOTPGroup>
//                         </InputOTP>
//                         <FieldInfo field={field} />
//                       </>
//                     )}
//                   />
//                 </div>
//               </TabsContent>
//               <TabsContent
//                 value="two-fa"
//                 className="py-4">
//                 <div className="flex flex-col gap-1">
//                   <label
//                     htmlFor="known-password"
//                     className="text-xs font-bold">
//                     Password
//                   </label>
//                   <form.Field
//                     name="password"
//                     validators={{
//                       onBlur: z.string().min(8, {
//                         message: 'Password must be atleast 8 characters '
//                       })
//                     }}
//                     children={(field) => (
//                       <>
//                         <Input
//                           id="known-password"
//                           name={field.name}
//                           value={field.state.value}
//                           type="password"
//                           onChange={(e) =>
//                             field.handleChange(e.target.value ?? '')
//                           }
//                           onBlur={field.handleBlur}
//                         />
//                         <FieldInfo field={field} />
//                       </>
//                     )}
//                   />
//                 </div>
//               </TabsContent>
//             </Tabs>
//           )}
//         />
//         <div className="flex flex-col gap-1">
//           <label
//             htmlFor="recovery-code"
//             className="text-xs font-bold">
//             Recovery Code
//           </label>
//           <form.Field
//             name="recoveryCode"
//             validators={{ onBlur: zodSchemas.nanoIdToken() }}
//             children={(field) => (
//               <>
//                 <Input
//                   id="recovery-code"
//                   name={field.name}
//                   value={field.state.value}
//                   onChange={(e) => field.handleChange(e.target.value)}
//                   onBlur={field.handleBlur}
//                 />
//                 <FieldInfo field={field} />
//               </>
//             )}
//           />
//         </div>
//         <form.Field
//           name="turnstileToken"
//           validators={{
//             onSubmit: turnstileEnabled
//               ? z.string({
//                   required_error:
//                     'Waiting for Captcha. If you can see the Captcha, complete it manually'
//                 })
//               : z.undefined()
//           }}
//           children={(field) => (
//             <>
//               <TurnstileComponent
//                 onSuccess={(value) => field.setValue(value)}
//               />
//               <FieldInfo field={field} />
//             </>
//           )}
//         />
//         <form.Subscribe
//           selector={(state) => [
//             state.isTouched,
//             state.canSubmit,
//             state.isSubmitting
//           ]}
//           children={([isTouched, canSubmit, isSubmitting]) => (
//             <Button
//               type="submit"
//               className="my-2"
//               loading={isSubmitting}
//               disabled={!isTouched || !canSubmit}>
//               Recover Credentials
//             </Button>
//           )}
//         />
//       </div>
//       <PasswordModalRoot />
//       <TOTPModalRoot />
//     </form>
//   );
// }

'use client';

import React from 'react';

const WorkInProgressComponent: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg font-semibold">This page is a work in progress.</p>
    </div>
  );
};

export default WorkInProgressComponent;
