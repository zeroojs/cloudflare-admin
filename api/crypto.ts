const encoder = new TextEncoder()
const decoder = new TextDecoder()
const PASSWORD_ITERATIONS = 100000

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const hashed = await crypto.subtle.digest('SHA-256', encoder.encode(secret))
  return crypto.subtle.importKey('raw', hashed, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptJson<T>(
  payload: T,
  secret: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(secret)
  const encoded = encoder.encode(JSON.stringify(payload))
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  )

  return JSON.stringify({
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(cipherBuffer)),
  })
}

export async function decryptJson<T>(
  payload: string,
  secret: string,
): Promise<T> {
  const parsed = JSON.parse(payload) as { iv: string; data: string }
  const key = await deriveKey(secret)
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(parsed.iv) },
    key,
    base64ToBytes(parsed.data),
  )

  return JSON.parse(decoder.decode(plainBuffer)) as T
}

async function derivePasswordBits(
  password: string,
  salt: Uint8Array,
  iterations = PASSWORD_ITERATIONS,
): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations,
    },
    keyMaterial,
    256,
  )
}

export async function hashPassword(password: string, secret: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const secretBytes = encoder.encode(secret)
  const mixedSalt = new Uint8Array(salt.length + secretBytes.length)
  mixedSalt.set(salt, 0)
  mixedSalt.set(secretBytes, salt.length)
  const hash = await derivePasswordBits(password, mixedSalt)

  return JSON.stringify({
    salt: bytesToBase64(salt),
    iterations: PASSWORD_ITERATIONS,
    hash: bytesToBase64(new Uint8Array(hash)),
  })
}

export async function verifyPassword(
  password: string,
  storedPayload: string,
  secret: string,
): Promise<boolean> {
  const parsed = JSON.parse(storedPayload) as {
    salt: string
    iterations?: number
    hash: string
  }

  const salt = base64ToBytes(parsed.salt)
  const secretBytes = encoder.encode(secret)
  const mixedSalt = new Uint8Array(salt.length + secretBytes.length)
  mixedSalt.set(salt, 0)
  mixedSalt.set(secretBytes, salt.length)
  const computed = await derivePasswordBits(
    password,
    mixedSalt,
    parsed.iterations ?? PASSWORD_ITERATIONS,
  )

  return bytesToBase64(new Uint8Array(computed)) === parsed.hash
}
