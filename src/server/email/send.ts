import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { env } from "@/env";
import { log } from "@/lib/log";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

/**
 * Envia um email transacional. Sem RESEND_API_KEY (só permitido em development)
 * o email é escrito no log, para se poder copiar o link de verificação, e o
 * HTML fica em `.data/emails/` para se ver no browser.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!resend || !env.EMAIL_FROM) {
    const file = message.html ? await writePreview(message) : null;
    log.info("email.dev", { to: message.to, subject: message.subject, text: message.text, file });
    return;
  }

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  if (error) {
    log.error("email.failed", { subject: message.subject, error: error.message });
    throw new Error(`Falha ao enviar email: ${error.message}`);
  }
}

async function writePreview(message: EmailMessage): Promise<string | null> {
  try {
    const dir = path.join(process.cwd(), ".data", "emails");
    await mkdir(dir, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${message.subject
      .normalize("NFD")
      .replace(/[^\w]+/g, "-")
      .slice(0, 60)}.html`;
    const file = path.join(dir, name);
    await writeFile(file, message.html!);
    return file;
  } catch {
    return null;
  }
}
