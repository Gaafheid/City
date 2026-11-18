'use client';
import { useState } from 'react';
import { readVisit, wordCount, type Visit } from '@/lib/visits';

export default function VisitFeedback({ place, onVisit }: { place: string; onVisit: () => void }) {
  const [visit, setVisit] = useState(() => readVisit(place));
  const [rating, setRating] = useState(visit?.rating ?? null);
  const [comment, setComment] = useState(visit?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  function persist(value: Visit) {
    localStorage.setItem(place, JSON.stringify(value));
    setVisit(value);
  }
  function mark() {
    try {
      persist({ reviewId: crypto.randomUUID(), rating: null, comment: '' });
      onVisit();
    } catch { setMessage('Allow browser storage to save your visit.'); }
  }
  async function save() {
    if (!visit || busy) return;
    setBusy(true);
    try {
      const update = { ...visit, rating, comment: comment.trim() };
      const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ place, ...update }) });
      if (!response.ok) throw new Error();
      persist(update);
      setMessage('Feedback saved.');
    } catch { setMessage('Could not save feedback. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="my-4 text-sm text-white">
    {!visit ? <button onClick={mark} className="text-cyan-300 py-2">Mark as visited</button> : <fieldset disabled={busy}>
      <legend>Visited · Was it worth the stop?</legend>
      {[1,2,3,4,5].map(n => <button key={n} aria-label={n + ' stars'} aria-pressed={rating === n} className={'p-2 text-xl ' + (n <= (rating ?? 0) ? 'text-amber-300' : 'text-slate-500')} onClick={() => {setRating(n === rating ? null : n); setMessage('');}}>★</button>)}
      <textarea aria-label="Optional private feedback" placeholder="Optional private comment" maxLength={800} className="block w-full bg-slate-800 rounded p-2" value={comment} onChange={e => {setComment(e.target.value); setMessage('');}} />
      <span>{wordCount(comment)} / 30 words</span>
      <button className="ml-4 py-2 text-cyan-300 disabled:opacity-50" disabled={wordCount(comment) > 30 || (rating === visit.rating && comment.trim() === visit.comment)} onClick={save}>Save feedback</button>
    </fieldset>}
    <p role="status">{message}</p>
  </section>;
}
