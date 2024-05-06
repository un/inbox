import { Flex, Separator } from '@radix-ui/themes';

export default function Stepper({
  step,
  total
}: {
  step: number;
  total: number;
}) {
  return (
    <Flex
      gap="2"
      align="center"
      justify="center"
      className="mx-auto mt-3 w-full">
      {Array.from({ length: total }).map((_, i) => (
        <Separator
          key={i}
          size="4"
          my="4"
          className="h-2 rounded-md"
          color={i < step ? 'grass' : 'gray'}
        />
      ))}
    </Flex>
  );
}
