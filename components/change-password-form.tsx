'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, LockKeyhole, Route } from 'lucide-react'
import { completeInitialPasswordChange } from '@/app/actions/driver'

export function ChangePasswordForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    const fields = new FormData(event.currentTarget)
    const currentPassword = String(fields.get('currentPassword') ?? '')
    const newPassword = String(fields.get('newPassword') ?? '')
    const confirmPassword = String(fields.get('confirmPassword') ?? '')
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.')
      setSaving(false)
      return
    }
    try {
      await completeInitialPasswordChange(currentPassword, newPassword)
      router.replace('/')
      router.refresh()
    } catch {
      setError('No se pudo cambiar la contraseña. Verifica la clave temporal y vuelve a intentarlo.')
      setSaving(false)
    }
  }

  return <main className="credential-page">
    <a className="brand credential-brand" href="/" aria-label="ECO ROUTE"><span className="brand-mark"><Route aria-hidden="true" /></span><span><strong>ECO</strong> ROUTE</span></a>
    <section className="credential-card" aria-labelledby="credential-title">
      <span className="credential-icon"><LockKeyhole aria-hidden="true" /></span>
      <p className="eyebrow">PRIMER INGRESO</p>
      <h1 id="credential-title">Crea tu contraseña personal</h1>
      <p className="credential-intro">Por seguridad, reemplaza la clave temporal antes de entrar a tus viajes. El administrador no podrá ver tu nueva contraseña.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="current-password">Clave temporal<input id="current-password" name="currentPassword" type="password" required autoComplete="current-password" maxLength={128} /></label>
        <label className="field-label" htmlFor="new-password">Nueva contraseña<input id="new-password" name="newPassword" type="password" required autoComplete="new-password" minLength={12} maxLength={128} /></label>
        <label className="field-label" htmlFor="confirm-password">Confirma tu contraseña<input id="confirm-password" name="confirmPassword" type="password" required autoComplete="new-password" minLength={12} maxLength={128} /></label>
        <p className="credential-hint">Usa al menos 12 caracteres.</p>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="button button-primary credential-submit" type="submit" disabled={saving}>{saving ? 'Actualizando…' : 'Guardar contraseña'}<ArrowRight aria-hidden="true" /></button>
      </form>
    </section>
    <p className="credential-footer">ECO ROUTE · Acceso seguro para conductores</p>
  </main>
}
