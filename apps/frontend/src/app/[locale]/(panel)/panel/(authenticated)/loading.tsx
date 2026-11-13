import { AdminPageSkeleton } from "@/components/shared/page-skeleton";

/**
 * Every page here reads the session, so none is static: without this boundary the router has nothing to
 * prefetch and a click waits for the whole page. Each folder with pages of its own below repeats it, since a
 * boundary covers only the pages directly under its folder.
 */
export default function Loading() {
  return <AdminPageSkeleton />;
}
