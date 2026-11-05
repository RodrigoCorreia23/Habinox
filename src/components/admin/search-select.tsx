"use client";

import { useId, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { Check, ChevronDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fieldClass } from "./field";

export type SearchSelectOption = { value: string; label: string; hint?: string; group?: string };

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/**
 * Escolher numa lista longa com pesquisa (ex.: o material do ERP, com o custo ao lado).
 * O valor vai para o formulário num input hidden com o name.
 */
export function SearchSelect({
  name,
  options,
  defaultValue = "",
  placeholder,
  emptyText,
  ariaLabel,
  required = false,
  onValueChange,
  invalid = false,
  className,
}: {
  name: string;
  options: SearchSelectOption[];
  defaultValue?: string;
  placeholder: string;
  emptyText: string;
  ariaLabel: string;
  required?: boolean;
  onValueChange?: (value: string) => void;
  invalid?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (words.length === 0) return options;
    return options.filter((option) => {
      const text = normalize(`${option.label} ${option.hint ?? ""} ${option.group ?? ""}`);
      return words.every((word) => text.includes(word));
    });
  }, [options, query]);

  const choose = (option: SearchSelectOption) => {
    setValue(option.value);
    onValueChange?.(option.value);
    setOpen(false);
    setQuery("");
  };

  const move = (delta: number) => {
    if (filtered.length === 0) return;
    const next = (active + delta + filtered.length) % filtered.length;
    setActive(next);
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${next}"]`)
      ?.scrollIntoView({ block: "nearest" });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          const index = filtered.findIndex((option) => option.value === value);
          setActive(Math.max(0, index));
        } else setQuery("");
      }}
    >
      <input type="hidden" name={name} value={value} required={required} />
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${ariaLabel}${selected ? `: ${selected.label}` : ""}`}
          className={cn(
            fieldClass,
            "flex w-full cursor-pointer items-center gap-2 text-left",
            invalid && "border-error border-2",
            className,
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-steel-light")}>
            {selected ? selected.label : placeholder}
          </span>
          {selected?.hint && (
            <span className="text-steel hidden shrink-0 text-[13px] tabular-nums sm:inline">
              {selected.hint}
            </span>
          )}
          <ChevronDown aria-hidden className="text-steel size-4 shrink-0" strokeWidth={1.75} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <div className="border-line-soft relative border-b">
          <Search
            aria-hidden
            className="text-steel pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            strokeWidth={1.75}
          />
          <input
            autoFocus
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
            aria-label={`Pesquisar ${ariaLabel.toLowerCase()}`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                move(1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                move(-1);
              } else if (event.key === "Enter") {
                event.preventDefault();
                const option = filtered[active];
                if (option) choose(option);
              }
            }}
            placeholder="Escreva para procurar"
            className="placeholder:text-steel-light h-10 w-full bg-transparent pr-3 pl-9 text-base outline-none md:text-sm"
          />
        </div>
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="max-h-72 overflow-y-auto p-1"
        >
          {filtered.length === 0 && <li className="text-steel px-3 py-2 text-sm">{emptyText}</li>}
          {filtered.map((option, index) => {
            const showGroup = option.group && option.group !== filtered[index - 1]?.group;
            return (
              <li key={option.value} role="presentation">
                {showGroup && (
                  <p role="presentation" className="text-steel-light px-3 pt-2 pb-1 text-xs">
                    {option.group}
                  </p>
                )}
                <div
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={option.value === value}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex min-h-9 cursor-pointer items-center gap-2 rounded-[2px] px-3 py-1.5 text-sm pointer-coarse:min-h-11",
                    index === active && "bg-surface-alt",
                  )}
                >
                  <Check
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0",
                      option.value === value ? "text-ink" : "invisible",
                    )}
                    strokeWidth={2}
                  />
                  <span className="min-w-0 flex-1">{option.label}</span>
                  {option.hint && (
                    <span className="text-steel shrink-0 text-[13px] tabular-nums">
                      {option.hint}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
