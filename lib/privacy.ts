/** Set when the data-handling notice is accepted, with or without an account. */
export const PRIVACY_COOKIE = "rf7_privacy";

export function setPrivacyCookie() {
  document.cookie = `${PRIVACY_COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
}
