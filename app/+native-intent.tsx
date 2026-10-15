export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // FileImportHandler reads the original Linking URL. Only rewrite Router's
  // destination, so Android file URIs never become unmatched screen routes.
  if (path.startsWith("file://") || path.startsWith("content://")) {
    return "/(drawer)/(tabs)/brewday/screen";
  }
  return path;
}
