import { describe, expect, it } from "vitest";
import { renderMarkup } from "../../../test-support/render";
import { ContentLanguageScope, I18nTextInput } from "./i18n-text-input";

describe("I18nTextInput", () => {
  it("edits the selected language, shows the other as placeholder and requires only one of them", () => {
    const markup = renderMarkup(<ContentLanguageScope placeSwitch={false} initial="en">
      <I18nTextInput label="Nome" value={{ pt: "Política" }} onChange={() => undefined} maxLength={80} required />
    </ContentLanguageScope>);
    expect(markup).toContain("Nome (EN)");
    expect(markup).toContain('placeholder="Política"');
    expect(markup).not.toContain("required");
  });
});
