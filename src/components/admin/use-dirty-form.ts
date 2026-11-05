"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Alterações por guardar num formulário: dirty passa a true ao primeiro input,
 * volta a false com reset ou markClean() (depois de guardar). Enquanto houver
 * alterações, o browser pergunta antes de sair da página.
 */
export function useDirtyForm() {
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Browsers antigos precisam de returnValue para mostrar a pergunta.
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const markDirty = useCallback(() => setDirty(true), []);
  const markClean = useCallback(() => setDirty(false), []);

  return {
    dirty,
    formProps: { onInput: markDirty, onChange: markDirty, onReset: markClean },
    markClean,
  };
}
