"use client";

import { FileButton, Group, Stack, Text } from "@mantine/core";
import { ImageUp, Trash2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { uploadFile } from "../shared/file-transfer";
import { MemberAvatar } from "../shared/member-avatar";
import { Button } from "../ui/button";
import { AVATAR_UPLOAD_ACCEPT, avatarErrorKey, avatarFileError, type AvatarError } from "./avatar-image";

/**
 * A photo chosen in a form: previewed locally until the form is saved, then uploaded in one stream.
 * The preview URL is released when it is replaced, discarded or the form goes away.
 */
export function useAvatarSelection() {
  const [selection, setSelection] = useState<{ file: File; url: string }>();
  const [error, setError] = useState<AvatarError>();
  const previewUrl = useRef<string | undefined>(undefined);
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);

  function replace(next?: { file: File; url: string }) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next?.url;
    setSelection(next);
  }

  return {
    file: selection?.file,
    preview: selection?.url,
    error,
    choose(file: File | null) {
      if (!file) return;
      const invalid = avatarFileError(file);
      setError(invalid);
      if (!invalid) replace({ file, url: URL.createObjectURL(file) });
    },
    discard() { replace(undefined); setError(undefined); },
    /** Sends the selection, if any, to `route`; true when there was nothing to send or it was stored. */
    async upload(route: string): Promise<boolean> {
      if (!selection) return true;
      const result = await uploadFile(route, selection.file);
      // A panel upload changes the client's storage; outside the panel nothing listens.
      if (result.error) { setError(avatarErrorKey(result.error)); return false; }
      replace(undefined);
      return true;
    },
  };
}

/** The photo (or initials), a picker and, for a stored photo, a removal that the parent confirms. */
export function AvatarField({ member, selection, disabled, onRemove }: {
  member: { id: string; name: string; email: string; avatarVersion?: string | null };
  selection: ReturnType<typeof useAvatarSelection>;
  disabled: boolean;
  /** Present when a stored photo can be removed. */
  onRemove?: () => void;
}) {
  const t = useTranslations("Profile.photo");
  const accept = Object.keys(AVATAR_UPLOAD_ACCEPT).join(",");
  // In the client panel, a used-up storage turns the picker off; removing a photo stays possible.
  const uploadsBlocked = false;
  return <Group gap="md" wrap="nowrap" align="center">
    <MemberAvatar member={member} src={selection.preview} size={72} />
    <Stack gap={6} miw={0}>
      <Text size="sm" fw={500}>{t("label")} <Text span size="xs" c="dimmed">({t("optional")})</Text></Text>
      <Group gap="xs">
        <FileButton onChange={selection.choose} accept={accept} disabled={disabled || uploadsBlocked}>
          {(props) => <Button {...props} size="xs" variant="light" leftSection={<ImageUp size={14} aria-hidden="true" />} disabled={disabled || uploadsBlocked}>
            {t(member.avatarVersion || selection.preview ? "change" : "choose")}
          </Button>}
        </FileButton>
        {selection.preview
          ? <Button size="xs" variant="subtle" color="gray" leftSection={<Undo2 size={14} aria-hidden="true" />} disabled={disabled}
            onClick={selection.discard}>{t("discard")}</Button>
          : member.avatarVersion && onRemove && <Button size="xs" variant="subtle" color="red" leftSection={<Trash2 size={14} aria-hidden="true" />}
            disabled={disabled} onClick={onRemove}>{t("remove")}</Button>}
      </Group>
      <Text size="xs" c={selection.error || uploadsBlocked ? "red" : "dimmed"} role={selection.error ? "alert" : undefined}>
        {selection.error ? t(`errors.${selection.error}`) : selection.preview ? t("pending") : t("hint")}
      </Text>
    </Stack>
  </Group>;
}
