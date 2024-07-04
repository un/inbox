interface MetadataProps {
  title: string;
  description: string;
}
export default function Metadata({ title, description }: MetadataProps) {
  return (
    <>
      <title>{title}</title>
      <meta
        name="description"
        content={description}
      />
    </>
  );
}
