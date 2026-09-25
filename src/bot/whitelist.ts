export function parseWhitelist(envWhitelist?: string): string[] {
  if (!envWhitelist) return [];
  return envWhitelist
    .split(',')
    .map((num) => num.trim().replace(/[^\d]/g, ''))
    .filter((num) => num.length > 0);
}

export function isNumberWhitelisted(senderJid: string, whitelist: string[]): boolean {
  if (whitelist.length === 0) {
    // If no whitelist configured, allow for testing/development
    return true;
  }

  const cleanSender = senderJid.split('@')[0]?.replace(/[^\d]/g, '') ?? '';
  return whitelist.some((allowedNum) => cleanSender.endsWith(allowedNum) || allowedNum.endsWith(cleanSender));
}
