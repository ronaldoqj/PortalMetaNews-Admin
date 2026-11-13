import { createNavigation } from "next-intl/navigation";

import { routeFromPathname, routing, type AppLocale, type RouteArea } from "./routing";

export const { Link, getPathname, redirect, usePathname, useRouter } = createNavigation(routing);

/** The clean external pathname of the same page in `locale`, or undefined when `pathname` is no route of `surface`. */
export function localizedPathname(pathname: string, surface: RouteArea, locale: AppLocale): string | undefined {
  const route = routeFromPathname(pathname, surface);
  if (!route) return undefined;
  const parameter = /\[(id|slug)\]/.exec(route);
  if (parameter) {
    // The parameter sits where the route has it, counted from the end: after it come only fixed segments.
    const fromEnd = route.split("/").filter(Boolean).reverse().indexOf(parameter[0]);
    const value = pathname.split("/").filter(Boolean).at(-1 - fromEnd)!;
    return getPathname({ locale, href: { pathname: route, params: { [parameter[1]]: value } } as Parameters<typeof getPathname>[0]["href"] });
  }
  return getPathname({ locale, href: route as Parameters<typeof getPathname>[0]["href"] });
}
