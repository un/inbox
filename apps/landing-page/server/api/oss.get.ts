export default defineCachedEventHandler(
  async (event) => {
    const OSSFriends = await $fetch('https://formbricks.com/api/oss-friends', {
      headers: {
        origin: ''
      }
    });
    return OSSFriends;
  },
  {
    base: 'oss-friends',
    swr: true,
    shouldBypassCache: () => !!import.meta.dev,
    getKey: (event) => `oss-friends`,
    maxAge: 60 * 60 * 24,
    staleMaxAge: 60 * 60 * 48
  }
);
