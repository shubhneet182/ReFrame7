/** The ReFrame7 cloud: the same artwork as the app icon. */
export function CloudMascot({ size = 36 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static icon
    <img
      src="/icons/icon-192.png"
      alt=""
      width={size}
      height={size}
      className="shrink-0"
      aria-hidden="true"
    />
  );
}
