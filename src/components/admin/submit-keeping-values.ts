import { type FormEvent, startTransition } from "react";

/**
 * Envia o formulário para a action sem o React o limpar a seguir.
 * Com `<form action={…}>`, o React 19 repõe os campos depois de cada envio,
 * mesmo quando a validação falha: o Bruno perdia o que tinha escrito.
 */
export function submitKeepingValues(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
