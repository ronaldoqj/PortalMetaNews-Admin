"use client";

import { notFound } from "next/navigation";

/**
 * Returned by a server page or layout for a 404: raised here instead of in the server component, the expected
 * error stays out of the RSC stream, whose development timing can be negative (`Performance.measure`).
 */
export function PageNotFound(): never {
  notFound();
}
