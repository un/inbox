type PageTitleProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
};
export function PageTitle({ title, description, children }: PageTitleProps) {
  return (
    <div className="border-base-5 flex w-full flex-row items-center justify-between gap-2 border-b pb-2">
      <div className="flex flex-col gap-1">
        <span className="font-display text-lg">{title}</span>
        {description && (
          <span className="text-base-11 text-sm">{description}</span>
        )}
      </div>

      {children}
    </div>
  );
}
