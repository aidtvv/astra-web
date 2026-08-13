const textEncoder = new TextEncoder();

export async function computeHash(data: unknown): Promise<string> {
  const serialized = JSON.stringify(data);
  const buffer = textEncoder.encode(serialized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = new Uint8Array(hashBuffer);
  const hashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

export function hashString(str: string): Promise<string> {
  const buffer = textEncoder.encode(str);
  return crypto.subtle.digest('SHA-256', buffer).then((hashBuffer) => {
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  });
}
