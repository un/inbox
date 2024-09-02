export function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9-_.]/g, '_');
}
