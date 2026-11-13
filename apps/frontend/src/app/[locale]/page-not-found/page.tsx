import { PageNotFound } from "@/components/shared/page-not-found";

/**
 * Where the proxy sends an address no area serves: a URL no route matches would get the framework's own
 * 404, while this page raises the localized `not-found` of the root layout. Never linked.
 */
export default function AddressNotFound() {
  return <PageNotFound />;
}
