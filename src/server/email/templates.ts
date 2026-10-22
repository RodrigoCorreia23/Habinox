import type { EmailMessage } from "./send";

// Textos simples por agora; templates HTML com a identidade da Habinox mais tarde.

export function verifyEmailMessage(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Confirme o seu email — Habinox",
    text: `Olá,\n\nPara ativar a sua conta na Habinox, confirme o seu email:\n${url}\n\nSe não criou esta conta, ignore este email.`,
  };
}

export function resetPasswordMessage(to: string, url: string): EmailMessage {
  return {
    to,
    subject: "Recuperar password — Habinox",
    text: `Olá,\n\nRecebemos um pedido para alterar a password da sua conta:\n${url}\n\nSe não fez este pedido, ignore este email. A password atual mantém-se.`,
  };
}
