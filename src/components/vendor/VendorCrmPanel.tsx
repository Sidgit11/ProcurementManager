"use client";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { toast } from "sonner";
import { Plus, Trash, PencilSimple, Check, X, Phone, WhatsappLogo, EnvelopeSimple } from "@phosphor-icons/react";

export interface Contact {
  id: string;
  vendorId: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  isPrimary: boolean;
  preferredChannel: string | null;
  language: string | null;
  notes: string | null;
}
export interface Note { id: string; body: string; createdAt: string }
export interface Preferences {
  preferredChannel?: "email" | "whatsapp" | "phone";
  language?: string;
  paymentTerms?: string;
  currency?: string;
  leadTimeTolerance?: number;
  bestTimeToReach?: string;
}

export function VendorCrmPanel({
  vendorId,
  initialContacts,
  initialNotes,
  initialPreferences,
}: {
  vendorId: string;
  initialContacts: Contact[];
  initialNotes: Note[];
  initialPreferences: Preferences;
}) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [prefs, setPrefs] = useState<Preferences>(initialPreferences);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<Contact>>({});
  const [noteDraft, setNoteDraft] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);

  async function saveContact(c: Partial<Contact>) {
    const isNew = !c.id;
    const url = isNew
      ? `/api/vendors/${vendorId}/contacts`
      : `/api/vendors/${vendorId}/contacts/${c.id}`;
    const method = isNew ? "POST" : "PATCH";
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(c) });
    if (!r.ok) { toast.error("Save failed"); return; }
    const saved = await r.json() as Contact;
    setContacts((prev) => isNew ? [saved, ...prev] : prev.map((x) => x.id === saved.id ? saved : x));
    setEditingContactId(null);
    setAdding(false);
    setDraft({});
    toast.success(isNew ? "Contact added" : "Contact updated");
  }

  async function deleteContact(id: string) {
    if (!confirm("Delete this contact?")) return;
    const r = await fetch(`/api/vendors/${vendorId}/contacts/${id}`, { method: "DELETE" });
    if (!r.ok) { toast.error("Delete failed"); return; }
    setContacts((prev) => prev.filter((x) => x.id !== id));
    toast.success("Contact deleted");
  }

  async function makePrimary(id: string) {
    await fetch(`/api/vendors/${vendorId}/contacts/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    setContacts((prev) => prev.map((x) => ({ ...x, isPrimary: x.id === id })));
    for (const c of contacts) {
      if (c.id !== id && c.isPrimary) {
        await fetch(`/api/vendors/${vendorId}/contacts/${c.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isPrimary: false }),
        });
      }
    }
  }

  async function addNote() {
    if (!noteDraft.trim()) return;
    const r = await fetch(`/api/vendors/${vendorId}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: noteDraft.trim() }),
    });
    if (!r.ok) { toast.error("Save failed"); return; }
    const saved = await r.json();
    setNotes((prev) => [saved, ...prev]);
    setNoteDraft("");
  }

  async function deleteNote(id: string) {
    const r = await fetch(`/api/vendors/${vendorId}/notes/${id}`, { method: "DELETE" });
    if (!r.ok) { toast.error("Delete failed"); return; }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function savePrefs() {
    setSavingPrefs(true);
    try {
      const r = await fetch(`/api/vendors/${vendorId}/preferences`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(prefs),
      });
      if (!r.ok) toast.error("Save failed"); else toast.success("Preferences saved");
    } finally { setSavingPrefs(false); }
  }

  function ContactRow({ c }: { c: Contact }) {
    const isEditing = editingContactId === c.id;
    const draftRef = isEditing ? draft : c;
    if (isEditing) {
      return (
        <div className="rounded-lg border border-forest-100/50 p-3 space-y-2 bg-white/80">
          <div className="grid grid-cols-2 gap-2">
            <input value={draftRef.name ?? ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Name" className="rounded border border-forest-100/60 px-2 py-1 text-sm" />
            <input value={draftRef.role ?? ""} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} placeholder="Role" className="rounded border border-forest-100/60 px-2 py-1 text-sm" />
            <input value={draftRef.email ?? ""} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} placeholder="Email" className="rounded border border-forest-100/60 px-2 py-1 text-sm" />
            <input value={draftRef.phone ?? ""} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} placeholder="Phone" className="rounded border border-forest-100/60 px-2 py-1 text-sm" />
            <input value={draftRef.whatsapp ?? ""} onChange={(e) => setDraft((d) => ({ ...d, whatsapp: e.target.value }))} placeholder="WhatsApp" className="rounded border border-forest-100/60 px-2 py-1 text-sm col-span-2" />
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-forest-500">Preferred channel</span>
            {(["email", "whatsapp", "phone"] as const).map((ch) => (
              <label key={ch} className="flex items-center gap-1 cursor-pointer">
                <input type="radio" name={`pc-${c.id}`} checked={draftRef.preferredChannel === ch} onChange={() => setDraft((d) => ({ ...d, preferredChannel: ch }))} />{ch}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setEditingContactId(null); setDraft({}); }}><X size={14}/> Cancel</Button>
            <Button variant="secondary" onClick={() => saveContact({ ...c, ...draftRef })}><Check size={14}/> Save</Button>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-forest-100/40 p-3 bg-white/60">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="font-medium">{c.name}</div>
              {c.isPrimary && <Pill label="PRIMARY" />}
              {c.preferredChannel && <span className="text-[10px] text-forest-500 uppercase tracking-wider">prefers {c.preferredChannel}</span>}
            </div>
            {c.role && <div className="text-xs text-forest-500">{c.role}</div>}
            <ul className="mt-2 space-y-0.5 text-xs">
              {c.email && <li className="flex items-center gap-1.5"><EnvelopeSimple size={12} className="text-forest-500"/><a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a></li>}
              {c.phone && <li className="flex items-center gap-1.5"><Phone size={12} className="text-forest-500"/>{c.phone}</li>}
              {c.whatsapp && <li className="flex items-center gap-1.5"><WhatsappLogo size={12} className="text-forest-500"/>{c.whatsapp}</li>}
            </ul>
          </div>
          <div className="flex flex-col gap-1">
            {!c.isPrimary && <button onClick={() => makePrimary(c.id)} className="text-[11px] text-forest-500 hover:text-forest-700 hover:underline">Make primary</button>}
            <button onClick={() => { setEditingContactId(c.id); setDraft(c); }} className="text-forest-500 hover:text-forest-700"><PencilSimple size={14}/></button>
            <button onClick={() => deleteContact(c.id)} className="text-forest-500 hover:text-red-700"><Trash size={14}/></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="label-caps">Contacts ({contacts.length})</div>
          {!adding && <Button variant="ghost" onClick={() => { setAdding(true); setDraft({ name: "", role: "", email: "", phone: "", whatsapp: "", preferredChannel: "email" }); }}><Plus size={14}/> Add contact</Button>}
        </div>
        <div className="space-y-2">
          {adding && (
            <div className="rounded-lg border border-forest-100/50 p-3 space-y-2 bg-white/80">
              <div className="grid grid-cols-2 gap-2">
                <input autoFocus value={draft.name ?? ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Name" className="rounded border border-forest-100/60 px-2 py-1 text-sm" />
                <input value={draft.role ?? ""} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} placeholder="Role" className="rounded border border-forest-100/60 px-2 py-1 text-sm" />
                <input value={draft.email ?? ""} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} placeholder="Email" className="rounded border border-forest-100/60 px-2 py-1 text-sm" />
                <input value={draft.phone ?? ""} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} placeholder="Phone" className="rounded border border-forest-100/60 px-2 py-1 text-sm" />
                <input value={draft.whatsapp ?? ""} onChange={(e) => setDraft((d) => ({ ...d, whatsapp: e.target.value }))} placeholder="WhatsApp" className="rounded border border-forest-100/60 px-2 py-1 text-sm col-span-2" />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-forest-500">Preferred channel</span>
                {(["email", "whatsapp", "phone"] as const).map((ch) => (
                  <label key={ch} className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="pc-new" checked={draft.preferredChannel === ch} onChange={() => setDraft((d) => ({ ...d, preferredChannel: ch }))} />{ch}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setAdding(false); setDraft({}); }}>Cancel</Button>
                <Button variant="secondary" onClick={() => draft.name && saveContact(draft)} disabled={!draft.name}>Save contact</Button>
              </div>
            </div>
          )}
          {contacts.length === 0 && !adding && <p className="text-sm text-forest-500">No contacts yet. Add one to keep your vendor records complete.</p>}
          {contacts.map((c) => <ContactRow key={c.id} c={c} />)}
        </div>
      </Card>

      <Card>
        <div className="label-caps mb-3">Preferences</div>
        <p className="text-xs text-forest-500 mb-3">How this vendor likes to be engaged. Used by Genie and the agentic layer to draft messages and time follow-ups appropriately.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-xs label-caps mb-1">Preferred channel</div>
            <select value={prefs.preferredChannel ?? ""} onChange={(e) => setPrefs((p) => ({ ...p, preferredChannel: (e.target.value || undefined) as Preferences["preferredChannel"] }))} className="w-full rounded-lg border border-forest-100/60 px-2 py-1.5 text-sm bg-white">
              <option value="">—</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Phone</option>
            </select>
          </label>
          <label className="block">
            <div className="text-xs label-caps mb-1">Language</div>
            <input value={prefs.language ?? ""} onChange={(e) => setPrefs((p) => ({ ...p, language: e.target.value || undefined }))} placeholder="en, pt, hi…" className="w-full rounded-lg border border-forest-100/60 px-2 py-1.5 text-sm" />
          </label>
          <label className="block">
            <div className="text-xs label-caps mb-1">Payment terms</div>
            <input value={prefs.paymentTerms ?? ""} onChange={(e) => setPrefs((p) => ({ ...p, paymentTerms: e.target.value || undefined }))} placeholder="30/70, LC at sight…" className="w-full rounded-lg border border-forest-100/60 px-2 py-1.5 text-sm" />
          </label>
          <label className="block">
            <div className="text-xs label-caps mb-1">Currency</div>
            <input value={prefs.currency ?? ""} onChange={(e) => setPrefs((p) => ({ ...p, currency: e.target.value || undefined }))} placeholder="USD" className="w-full rounded-lg border border-forest-100/60 px-2 py-1.5 text-sm" />
          </label>
          <label className="block">
            <div className="text-xs label-caps mb-1">Lead time tolerance (days)</div>
            <input type="number" value={prefs.leadTimeTolerance ?? ""} onChange={(e) => setPrefs((p) => ({ ...p, leadTimeTolerance: e.target.value ? Number(e.target.value) : undefined }))} className="w-full rounded-lg border border-forest-100/60 px-2 py-1.5 text-sm" />
          </label>
          <label className="block">
            <div className="text-xs label-caps mb-1">Best time to reach</div>
            <input value={prefs.bestTimeToReach ?? ""} onChange={(e) => setPrefs((p) => ({ ...p, bestTimeToReach: e.target.value || undefined }))} placeholder="9am–11am IST" className="w-full rounded-lg border border-forest-100/60 px-2 py-1.5 text-sm" />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" onClick={savePrefs} disabled={savingPrefs}>{savingPrefs ? "Saving…" : "Save preferences"}</Button>
        </div>
      </Card>

      <Card>
        <div className="label-caps mb-3">Notes</div>
        <div className="flex gap-2 mb-3">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="What's worth remembering? Negotiation patterns, family details, recent quality wins or issues…"
            rows={2}
            className="flex-1 rounded-lg border border-forest-100/60 px-3 py-2 text-sm"
          />
          <Button variant="secondary" onClick={addNote} disabled={!noteDraft.trim()}>Add note</Button>
        </div>
        <ul className="space-y-2">
          {notes.length === 0 && <li className="text-sm text-forest-500">No notes yet.</li>}
          {notes.map((n) => (
            <li key={n.id} className="flex items-start justify-between gap-3 rounded-lg bg-white/60 p-2.5 text-sm">
              <div>
                <div>{n.body}</div>
                <div className="text-[11px] text-forest-500 mt-0.5">{new Date(n.createdAt).toISOString().slice(0, 10)}</div>
              </div>
              <button onClick={() => deleteNote(n.id)} className="text-forest-500 hover:text-red-700"><Trash size={14}/></button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
