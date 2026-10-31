"use client";

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui';
import { listPendingMenuContributions, reviewMenuContribution, type MenuContribution } from '@/lib/api/menu-contributions';
import styles from './menu-contributions.module.css';

export function AdminMenuContributionsView() {
  const [items, setItems] = useState<MenuContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [sourceUrls, setSourceUrls] = useState<Record<number, string>>({});
  async function refresh() {
    setLoading(true);
    try { setItems(await listPendingMenuContributions()); setError(false); }
    catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function review(id: number, decision: 'accepted' | 'rejected') {
    setBusyId(id);
    const sourceUrl = decision === 'accepted' ? (sourceUrls[id] || items.find((item) => item.id === id)?.sourceUrl || undefined) : undefined;
    try { await reviewMenuContribution(id, decision, sourceUrl ?? undefined); setItems((current) => current.filter((item) => item.id !== id)); }
    catch { setError(true); }
    finally { setBusyId(null); }
  }
  return (
    <div className={styles.page}>
      <header className={styles.header}><div><span className="sp-label">catálogo de Mendoza</span><h1>Cartas por revisar</h1><p>Confirmá que el menú pertenezca a este lugar. Los enlaces aceptados todavía pasan por validación de identidad y vigencia antes de cotizar.</p></div><span className={styles.count}>{items.length} pendientes</span></header>
      {error ? <p className={styles.state} role="alert">No pudimos actualizar la bandeja. Revisá tu conexión e intentá otra vez.</p> : null}
      {loading ? <p className={styles.state}>Cargando cartas…</p> : null}
      {!loading && !items.length && !error ? <div className={styles.empty}><span><Icon name="check" size={20} /></span><h2>Todo revisado</h2><p>Los nuevos aportes van a aparecer acá.</p></div> : null}
      <div className={styles.list}>{items.map((item) => (
        <article className={styles.card} key={item.id}>
          <div className={styles.cardTop}><div><span className={styles.place}>{item.placeName}</span><span className={styles.meta}>{item.contributor ? `Aportó ${item.contributor} · ` : ''}{new Date(item.submittedAt).toLocaleDateString('es-AR')}</span></div><span className={styles.pending}>pendiente</span></div>
          {item.sourceUrl ? <a className={styles.source} href={item.sourceUrl} target="_blank" rel="noreferrer">Abrir carta o fuente <Icon name="external-link" size={14} /></a> : null}
          {!item.sourceUrl ? <label className={styles.sourceInput}>Enlace público que confirma esta carta<input type="url" value={sourceUrls[item.id] ?? ''} onChange={(event) => setSourceUrls((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="https://sitio-oficial/..." /></label> : null}
          {item.menuText ? <pre className={styles.text}>{item.menuText}</pre> : null}
          <div className={styles.checklist}>Confirmá identidad del local, precios y vigencia. La aceptación encola el enlace; el sistema todavía valida la identidad y actualidad antes de usar precios.</div>
          <div className={styles.actions}><button disabled={busyId === item.id} className={styles.reject} onClick={() => void review(item.id, 'rejected')}>Descartar</button><button disabled={busyId === item.id || !(sourceUrls[item.id] || item.sourceUrl)} className={styles.accept} title={!(sourceUrls[item.id] || item.sourceUrl) ? 'Hace falta un enlace público para verificar esta carta' : undefined} onClick={() => void review(item.id, 'accepted')}>Enviar a verificación <Icon name="arrow-right" size={14} /></button></div>
        </article>
      ))}</div>
    </div>
  );
}
