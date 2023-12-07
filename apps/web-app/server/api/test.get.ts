export default defineEventHandler(async (event) => {
  const response = new Date().toString();

  await setTimeout(() => {
    console.log('done');
  }, 1000);
  return response;
});
