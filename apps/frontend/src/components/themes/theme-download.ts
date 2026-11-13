import { themeFileContent, themeFileName, type ThemeFile } from "./theme-file";

/** Hands the browser a theme as a `.theme.json` file, built locally: nothing is sent anywhere. */
export function downloadThemeFile(theme: ThemeFile): void {
  const url = URL.createObjectURL(new Blob([themeFileContent(theme)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = themeFileName(theme.name);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
