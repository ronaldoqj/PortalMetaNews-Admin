import Image from "next/image";

/**
 * A logo for each colour scheme, both in the server markup: CSS shows the one of the rendered scheme,
 * so switching schemes never fetches or flashes. URLs are same-origin and resolved on the server.
 * The box has a fixed size, so the page does not shift while the image loads.
 */
export function BrandLogo({ light, dark, alt, className }: { light: string; dark?: string; alt: string; className: string }) {
  if (!dark || dark === light) {
    return <Image src={light} alt={alt} width={480} height={160} unoptimized loading="eager" className={className} />;
  }
  return <>
    <Image src={light} alt={alt} width={480} height={160} unoptimized loading="eager" className={`${className} brand-logo-light`} />
    <Image src={dark} alt={alt} width={480} height={160} unoptimized loading="eager" className={`${className} brand-logo-dark`} />
  </>;
}
