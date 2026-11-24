"use client";

// Eintragen-Blatt (Konzept docs/konzept-buendeln.md, Baustein 7; vorher Sammelliste Punkt 20):
// ein Ablauf für jedes Formular. Titel oben, Felder, unten Speichern und Abbrechen, Löschen mit Rückfrage.
// instant: jede Änderung speichert sofort (z. B. Wadenkrampf), unten steht dann nur „Fertig“.
// Natives <dialog>: Fokus bleibt im Bogen, Esc schließt.

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  title: string;
  open: boolean;
  onClose: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  instant?: boolean; // speichert bei jedem Tipp, nur „Fertig“
  saveLabel?: string; // z. B. „Hinzufügen“
  error?: string; // Hinweis über den Knöpfen
  deleteQuestion?: string; // Rückfrage vor dem Löschen
  saving?: boolean;
  canSave?: boolean;
  children: ReactNode;
};

export default function EditSheet({ title, open, onClose, onSave, onDelete, instant = false, saveLabel = "Speichern", error, deleteQuestion = "Diesen Eintrag löschen?", saving = false, canSave = true, children }: Props) {
  const ref = useRef<HTMLDialogElement | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="edit-sheet" aria-label={title} onClose={onClose} onCancel={onClose}>
      <form
        method="dialog"
        className="edit-sheet-body"
        onSubmit={(e) => {
          e.preventDefault();
          if (instant) onClose();
          else if (canSave && !saving) onSave?.();
        }}
      >
        <div className="card-row">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
        {error && <p className="alert alert-inline" role="alert">{error}</p>}
        {instant ? (
          <button type="submit" className="btn btn-dark">Fertig</button>
        ) : (
          <div className="edit-sheet-actions">
            <button type="submit" className="btn btn-dark" disabled={!canSave || saving}>
              {saving ? "Speichert …" : saveLabel}
            </button>
            <button type="button" className="btn btn-soft" onClick={onClose}>
              Abbrechen
            </button>
          </div>
        )}
        {onDelete && (
          <button
            type="button"
            className="btn btn-quiet edit-sheet-delete"
            onClick={() => {
              if (window.confirm(deleteQuestion)) onDelete();
            }}
          >
            Löschen
          </button>
        )}
      </form>
    </dialog>
  );
}

// Stift rechts in einer Listenzeile: zeigt, dass man den Eintrag ändern kann
export function EditIcon() {
  return (
    <svg className="edit-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}
