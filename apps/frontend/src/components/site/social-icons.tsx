import {
  IconBrandFacebook, IconBrandInstagram, IconBrandLinkedin, IconBrandTelegram, IconBrandTiktok, IconBrandWhatsapp, IconBrandX, IconBrandYoutube, type Icon,
} from "@tabler/icons-react";
import type { SocialNetwork } from "../../theme/site-settings";

/** The mark of each social network the portal may link to (`theme/site-settings.ts`). */
export const SOCIAL_ICONS: Record<SocialNetwork, Icon> = {
  instagram: IconBrandInstagram, facebook: IconBrandFacebook, x: IconBrandX, youtube: IconBrandYoutube, tiktok: IconBrandTiktok,
  linkedin: IconBrandLinkedin, whatsapp: IconBrandWhatsapp, telegram: IconBrandTelegram,
};
