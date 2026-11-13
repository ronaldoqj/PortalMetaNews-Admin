import localFont from "next/font/local";

import type { FontOption } from "../../tokens/typography";

/*
 * Every typeface an identity may choose, bundled with the frontend so no page contacts a font provider
 * (latin subsets; Satoshi and General Sans come from Fontshare under the ITF Free Font License). Each one
 * declares `--font-<key>` on the root element and its `@font-face`, which the browser downloads only when
 * a rendered element uses it. Only Manrope, the default of the administrative areas, is preloaded:
 * Turbopack applies next/font preloads to every route, so preloading the others (Newsreader, the default headings
 * typeface of the site and the portals, included) would make each page fetch fonts it never renders. Another chosen font starts downloading as soon as the first paint uses it, and its metric-adjusted
 * fallback (`adjustFontFallback`, on by default) keeps the swap from shifting the layout.
 */

const manrope = localFont({
  src: "./manrope.woff2", weight: "200 800", variable: "--font-manrope", display: "swap", preload: true,
});
const inter = localFont({
  src: "./inter.woff2", weight: "100 900", variable: "--font-inter", display: "swap", preload: false,
});
const plusJakartaSans = localFont({
  src: "./plus-jakarta-sans.woff2", weight: "200 800", variable: "--font-plus-jakarta-sans", display: "swap", preload: false,
});
const satoshi = localFont({
  src: "./satoshi.woff2", weight: "300 900", variable: "--font-satoshi", display: "swap", preload: false,
});
const generalSans = localFont({
  src: "./general-sans.woff2", weight: "200 700", variable: "--font-general-sans", display: "swap", preload: false,
});
const roboto = localFont({
  src: "./roboto.woff2", weight: "100 900", variable: "--font-roboto", display: "swap", preload: false,
});
// Not a variable font: one file per weight the interface uses.
const poppins = localFont({
  src: [
    { path: "./poppins-400.woff2", weight: "400" },
    { path: "./poppins-500.woff2", weight: "500" },
    { path: "./poppins-600.woff2", weight: "600" },
    { path: "./poppins-700.woff2", weight: "700" },
    { path: "./poppins-800.woff2", weight: "800" },
  ],
  variable: "--font-poppins", display: "swap", preload: false,
});
const nunito = localFont({
  src: "./nunito.woff2", weight: "200 1000", variable: "--font-nunito", display: "swap", preload: false,
});
const publicSans = localFont({
  src: "./public-sans.woff2", weight: "100 900", variable: "--font-public-sans", display: "swap", preload: false,
});
// A serif: its fallback is measured against a serif too.
const newsreader = localFont({
  src: "./newsreader.woff2", weight: "200 800", variable: "--font-newsreader", display: "swap", preload: false,
  adjustFontFallback: "Times New Roman",
});

/** The loaded fonts by option; `system-ui` has no file. */
export const fonts = {
  manrope, inter, "plus-jakarta-sans": plusJakartaSans, satoshi, "general-sans": generalSans, roboto, poppins, nunito, "public-sans": publicSans, newsreader,
} as const satisfies Record<Exclude<FontOption, "system-ui">, { variable: string }>;

/**
 * The classes that declare every `--font-*` variable, for the root `<html>` element. They only define
 * variables and `@font-face` rules, so applying them changes no layout.
 */
export const fontVariables = Object.values(fonts).map((font) => font.variable).join(" ");
