import Image from "next/image";

type LogoProps = {
  size?: number;
};

/**
 * Circularly-cropped photo of Tim, used as the header avatar. A literal
 * photo, not an illustrated mark — explicit choice, see
 * docs/design-ui-redesign.md. object-cover crops the (non-square)
 * source to fit the circle, so no separate pre-cropped asset is needed
 * here (unlike the favicon, which the browser renders uncropped).
 */
export function Logo({ size = 40 }: LogoProps) {
  return (
    <Image
      src="/tim.jpg"
      alt="Tim"
      width={size}
      height={size}
      className="rounded-full border border-stone-300 object-cover dark:border-stone-600"
      style={{ width: size, height: size }}
      priority
    />
  );
}
