"use client";
import { useId, useMemo, useState } from "react";

export interface Option {
  value: string;
  label: string;
  /** small secondary text, e.g. the country of a city */
  hint?: string;
  count?: number;
}

interface Props {
  label: string;
  placeholder: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Display text for a selected value that is no longer in `options` */
  format?: (value: string) => string;
  disabled?: boolean;
  searchPlaceholder?: string;
}

const MAX_RENDERED = 250;

export default function MultiSelect({ label, placeholder, options, selected, onChange, format, disabled, searchPlaceholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listId = useId();

  const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options]);
  const chosen = useMemo(() => new Set(selected), [selected]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(q)) : options;
    return list.slice(0, MAX_RENDERED);
  }, [options, query]);

  const toggle = (v: string) => onChange(chosen.has(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const textFor = (v: string) => byValue.get(v)?.label ?? format?.(v) ?? v;
  const hintFor = (v: string) => byValue.get(v)?.hint;

  return (
    <div
      className="ms"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <span className="ms-label">{label}</span>
      <button
        type="button"
        className="ms-trigger"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected.length ? `${selected.length} selected` : placeholder}</span>
        <span aria-hidden="true" className="ms-caret">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {selected.length > 0 && (
        <div className="ms-chips">
          {selected.map((v) => (
            <span className="chip ms-chip" key={v}>
              {textFor(v)}
              {hintFor(v) && options.length && selected.length > 1 ? <small>{hintFor(v)}</small> : null}
              <button type="button" aria-label={`Remove ${textFor(v)}`} onClick={() => toggle(v)}>
                ×
              </button>
            </span>
          ))}
          <button type="button" className="btn link" onClick={() => onChange([])}>
            Clear
          </button>
        </div>
      )}

      {open && (
        <div className="ms-panel" id={listId}>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder ?? "Search…"}
            aria-label={`Search ${label.toLowerCase()}`}
          />
          <ul className="ms-list">
            {shown.map((o) => (
              <li key={o.value}>
                <label className="ms-opt">
                  <input type="checkbox" checked={chosen.has(o.value)} onChange={() => toggle(o.value)} />
                  <span className="ms-text">
                    {o.label}
                    {o.hint ? <small>{o.hint}</small> : null}
                  </span>
                  {o.count !== undefined && <small className="ms-count">{o.count}</small>}
                </label>
              </li>
            ))}
            {!shown.length && <li className="ms-empty">No matches</li>}
          </ul>
          {options.length > MAX_RENDERED && !query && <p className="ms-more">Showing the {MAX_RENDERED} most common – type to search the rest.</p>}
        </div>
      )}
    </div>
  );
}
