"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { z } from "zod";
import { AutoForm, Button, type FormField } from "../ui";
import { sendContact } from "./contact-actions";
import { CONTACT_TOPICS, type ContactTopic } from "./contracts";
import styles from "./site.module.css";

type Values = { name: string; email: string; topic: ContactTopic; message: string; website: string };

/** Readable characters of a message, markup aside: what the API accepts. */
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 5000;
const readable = (html: string) => html.replace(/<br>/g, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/g, "x").trim();

const contactSchema = z.object({
  name: z.string().trim().min(1).max(160), email: z.email().max(254), topic: z.enum(CONTACT_TOPICS),
  message: z.string().refine((html) => readable(html).length >= MESSAGE_MIN && readable(html).length <= MESSAGE_MAX),
  website: z.string().max(200),
});

/** The reader's message to the newsroom: who they are, what about and the message itself, with a honeypot for robots. */
export function ContactForm() {
  const translate = useTranslations("Contact");
  const [sent, setSent] = useState(0);
  if (sent) return <div className={styles.notice} role="status">
    <strong>{translate("sentTitle")}</strong><p>{translate("sentBody")}</p>
    <Button variant="subtle" mt="sm" onClick={() => setSent(0)}>{translate("sendAnother")}</Button>
  </div>;
  const fields: FormField<Values>[] = [
    { name: "name", type: "text", label: translate("name"), required: true, maxLength: 160 },
    { name: "email", type: "email", label: translate("email"), required: true, maxLength: 254 },
    { name: "topic", type: "select", label: translate("topic"), required: true, wide: true, options: CONTACT_TOPICS.map((value) => ({ value, label: translate(`topics.${value}`) })) },
    { name: "message", type: "richtext", label: translate("message"), description: translate("messageHint"), required: true, maxLength: MESSAGE_MAX, minRows: 6 },
    { name: "website", type: "custom", label: "", render: ({ value, onChange }) => <div className={styles.trap} aria-hidden="true">
      <label>Website<input name="website" tabIndex={-1} autoComplete="off" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} /></label>
    </div> },
  ];
  return <AutoForm<Values> key={sent} fields={fields} schema={contactSchema} submitLabel={translate("send")} onSuccess={() => setSent((count) => count + 1)}
    initial={{ name: "", email: "", topic: "tip", message: "", website: "" }} onSubmit={sendContact}
    errors={{ invalidInput: translate("errors.invalidInput"), rateLimited: translate("errors.rateLimited"), unavailable: translate("errors.unavailable") }} />;
}
