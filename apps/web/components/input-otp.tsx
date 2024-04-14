'use client';

import {
  type ElementRef,
  type ComponentPropsWithoutRef,
  forwardRef,
  useContext
} from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';
import { Dot } from 'lucide-react';
import { Flex, Box } from '@radix-ui/themes';
import { cn } from '@/lib/utils';

const InputOTP = forwardRef<
  ElementRef<typeof OTPInput>,
  ComponentPropsWithoutRef<typeof OTPInput>
>(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      'flex items-center gap-2 has-[:disabled]:opacity-50',
      containerClassName
    )}
    className={cn('!w-full disabled:cursor-not-allowed', className)}
    {...props}
  />
));
InputOTP.displayName = 'InputOTP';

const InputOTPGroup = forwardRef<
  ElementRef<'div'>,
  ComponentPropsWithoutRef<'div'>
>(({ ...props }, ref) => (
  <Flex
    align="center"
    ref={ref}
    {...props}
  />
));
InputOTPGroup.displayName = 'InputOTPGroup';

const InputOTPSlot = forwardRef<
  ElementRef<'div'>,
  ComponentPropsWithoutRef<'div'> & { index: number }
>(({ index, className, ...props }, ref) => {
  const inputOTPContext = useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]!;

  return (
    <Flex
      ref={ref}
      width="40px"
      height="40px"
      className={cn(
        'relative items-center justify-center border-y border-r border-gray-500 text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md',
        isActive && 'ring-ring ring-offset-background z-10 ring-2',
        className
      )}
      {...props}>
      {char}
      {hasFakeCaret && (
        <Flex
          align="center"
          justify="center"
          inset="0"
          position="absolute"
          className="pointer-events-none">
          <Box
            height="16px"
            width="1px"
            className="animate-caret-blink bg-gray-500 duration-1000"
          />
        </Flex>
      )}
    </Flex>
  );
});
InputOTPSlot.displayName = 'InputOTPSlot';

const InputOTPSeparator = forwardRef<
  ElementRef<'div'>,
  ComponentPropsWithoutRef<'div'>
>(({ ...props }, ref) => (
  <Box
    ref={ref}
    role="separator"
    {...props}>
    <Dot />
  </Box>
));
InputOTPSeparator.displayName = 'InputOTPSeparator';

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
