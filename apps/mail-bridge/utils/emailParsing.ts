export function rfc2822DateTime(s: string) {
  return parseDate(s, 'ddd, DD MMM YYYY HH:mm:ss [+0000]');
}
