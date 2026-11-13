import { SitePageSkeleton } from "@/components/shared/page-skeleton";

/** Shown at once on navigation, inside the site's frame, until the page streams in. */
export default function Loading() {
  return <SitePageSkeleton />;
}
