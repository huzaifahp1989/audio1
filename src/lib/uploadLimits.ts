export const MAX_GUEST_UPLOAD_BYTES = 50 * 1024 * 1024
export const MAX_SIGNED_IN_UPLOAD_BYTES = 100 * 1024 * 1024

export function getMaxUploadBytes(isSignedIn: boolean): number {
  return isSignedIn ? MAX_SIGNED_IN_UPLOAD_BYTES : MAX_GUEST_UPLOAD_BYTES
}

export function formatMaxUploadLabel(isSignedIn: boolean): string {
  return isSignedIn ? '100MB' : '50MB'
}
