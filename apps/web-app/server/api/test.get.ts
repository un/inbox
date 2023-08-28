export default defineEventHandler(() => {
  const { jwks } = useRuntimeConfig();
  console.log(jwks);
  return { jwks };
});
