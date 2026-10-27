"use client";
import { useRef, useState } from "react";
import { extractResumeText } from "@/lib/resume";
import { topSkillsInResume, type ResumeProfile } from "@/lib/scoring";

interface Props {
  name: string;
  profile: ResumeProfile | null;
  remember: boolean;
  setRemember: (v: boolean) => void;
  scoring: { done: number; total: number };
  onResume: (text: string, name: string) => void;
  onClear: () => void;
}

export default function ResumePanel({ name, profile, remember, setRemember, scoring, onResume, onClear }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState(false);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onResume(await extractResumeText(file), file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function submitPaste() {
    if (draft.trim().length < 80) {
      setError("Paste a bit more – at least a few lines of your resume.");
      return;
    }
    setError("");
    onResume(draft, "Pasted text");
    setDraft("");
    setPaste(false);
  }

  return (
    <section className="panel resume">
      <h2>Your resume</h2>
      {!profile ? (
        <>
          <label
            className={`drop${drag ? " drag" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void handleFile(e.dataTransfer.files?.[0]);
            }}
          >
            <input ref={input} type="file" accept=".pdf,.docx,.txt,.md,application/pdf" onChange={(e) => void handleFile(e.target.files?.[0])} hidden />
            <strong>{busy ? "Reading…" : "Drop your resume here"}</strong>
            <span>PDF, DOCX or TXT – or click to browse</span>
          </label>
          <button className="btn link" onClick={() => setPaste((v) => !v)}>
            {paste ? "Cancel" : "or paste text instead"}
          </button>
          {paste && (
            <div className="paste">
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={7} placeholder="Paste your resume text here…" />
              <button className="btn primary" onClick={submitPaste}>
                Use this text
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="resume-ok">
          <div className="resume-file">
            <span className="check">✓</span>
            <div>
              <b>{name || "Resume"}</b>
              <small>
                {profile.wordCount.toLocaleString()} words · {profile.years !== null ? `~${profile.years} yrs experience` : "years not detected"}
                {profile.level ? ` · reads as ${profile.level}` : ""}
              </small>
            </div>
          </div>
          <div className="why-row">
            {topSkillsInResume(profile, 8).map((s) => (
              <span className="chip good" key={s}>
                {s}
              </span>
            ))}
          </div>
          {scoring.total > 0 && scoring.done < scoring.total && (
            <div className="progress" role="status">
              <div style={{ width: `${(scoring.done / scoring.total) * 100}%` }} />
              <small>
                Scoring {scoring.done}/{scoring.total}
              </small>
            </div>
          )}
          <div className="row-between">
            <button className="btn link" onClick={() => input.current?.click()}>
              Replace
            </button>
            <input ref={input} type="file" accept=".pdf,.docx,.txt,.md,application/pdf" onChange={(e) => void handleFile(e.target.files?.[0])} hidden />
            <button className="btn link danger" onClick={onClear}>
              Remove
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <label className="check-row">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span>Remember on this device</span>
      </label>
      <p className="privacy">🔒 Parsed and scored in your browser. Your resume is never uploaded or sent to any server.</p>
    </section>
  );
}
