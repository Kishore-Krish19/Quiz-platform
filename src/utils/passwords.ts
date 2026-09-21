// Same alphabet as the server's generator: lowercase letters and digits without the
// look-alikes (0/o, 1/l/i), so a password read off a printed slip is typed right.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

/** 8 random characters (~40 bits), drawn without modulo bias. */
export function generatePlayerPassword(length = 8): string {
  const limit = 256 - (256 % ALPHABET.length);
  let password = '';
  while (password.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const byte of bytes) {
      if (byte < limit && password.length < length) {
        password += ALPHABET[byte % ALPHABET.length];
      }
    }
  }
  return password;
}
