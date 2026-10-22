"use client";

import { useState, type FormEvent } from 'react';
import { Icon } from '@/components/ui';
import { submitMenuContribution, submitMenuContributionPhoto } from '@/lib/api/menu-contributions';
import styles from './menu-contribution.module.css';

export function MenuContributionForm({ placeId, placeName }: { placeId: number; placeName: string }) {
  const [open, setOpen] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [menuText, setMenuText] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('sending');
    try {
      if (photo) await submitMenuContributionPhoto(placeId, photo);
      else await submitMenuContribution(placeId, {
        sourceUrl: sourceUrl.trim() || undefined,
        menuText: menuText.trim() || undefined,
      });
      setState('sent');
      setSourceUrl('');
      setMenuText('');
      setPhoto(null);
    } catch {
      setState('error');
    }
  }

  return (
    <section className={styles.card} aria-labelledby="menu-contribution-title">
      <div className={styles.icon} aria-hidden="true"><Icon name="utensils" size={18} /></div>
      <div className={styles.body}>
        <h2 id="menu-contribution-title">¿Tenés la carta de {placeName}?</h2>
        <p>Subí una foto, compartí el enlace o pegá el menú. SmartPlan puede leer la carta; un administrador revisa precios y lugar antes de publicarla.</p>
        {!open ? <button className={styles.open} type="button" onClick={() => setOpen(true)}>Aportar carta <Icon name="arrow-right" size={15} /></button> : null}
        {open && state !== 'sent' ? (
          <form className={styles.form} onSubmit={(event) => void submit(event)}>
            <label>Foto del menú <span>JPG, PNG o WebP · hasta 8 MB</span><input className={styles.file} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} /></label>
            {photo ? <p className={styles.photoNote}><Icon name="check" size={14} /> SmartPlan leerá el texto y lo dejará pendiente de revisión.</p> : null}
            <label>Enlace público <span>opcional</span><input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://..." maxLength={500} /></label>
            <label>Texto del menú <span>opcional</span><textarea value={menuText} onChange={(event) => setMenuText(event.target.value)} placeholder="Platos, bebidas y precios tal como aparecen en la carta" minLength={20} maxLength={80000} rows={5} /></label>
            <p className={styles.note}>Usá información pública o que tengas autorización para compartir. El aporte queda pendiente y no cambia las recomendaciones hasta que se verifique.</p>
            {state === 'error' ? <p role="alert" className={styles.error}>No pudimos leer o enviar la carta. Probá con una foto más nítida o iniciá sesión.</p> : null}
            <div className={styles.actions}>
              <button className={styles.cancel} type="button" onClick={() => setOpen(false)}>Cancelar</button>
              <button className={styles.send} type="submit" disabled={state === 'sending' || (!photo && !sourceUrl.trim() && menuText.trim().length < 20)}>{state === 'sending' ? 'Leyendo…' : 'Enviar para revisión'}</button>
            </div>
          </form>
        ) : null}
        {state === 'sent' ? <p className={styles.success} role="status"><Icon name="check" size={16} /> La carta quedó en revisión. Gracias por ayudar a completar Mendoza.</p> : null}
      </div>
    </section>
  );
}
