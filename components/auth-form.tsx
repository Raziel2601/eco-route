'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isSignUp = mode === 'sign-up'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = isSignUp
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password })
      if (result.error) {
        setError('No pudimos completar el acceso. Revisa tus datos e inténtalo de nuevo.')
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('No pudimos completar el acceso. Inténtalo de nuevo más tarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-visual" aria-label="ECO ROUTE">
        <div className="visual-grid" aria-hidden="true" />
        <div className="login-brand"><span className="brand"><span className="brand-mark"><Route /></span><span><strong>ECO</strong> ROUTE</span></span></div>
        <div className="route-orbit orbit-one" aria-hidden="true" />
        <div className="route-orbit orbit-two" aria-hidden="true" />
        <div className="visual-copy">
          <p className="eyebrow">OPERACIÓN INTELIGENTE</p>
          <h1>Muévete mejor.<br /><em>Llega seguro.</em></h1>
          <p>Organiza vehículos, equipo y recorridos desde un solo espacio.</p>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="login-heading">
            <p className="eyebrow">{isSignUp ? 'NUEVO ESPACIO' : 'BIENVENIDO DE VUELTA'}</p>
            <h2>{isSignUp ? 'Crea tu cuenta' : 'Ingresa a tu espacio'}</h2>
            <p>{isSignUp ? 'Empieza a organizar tu operación.' : 'Accede a la gestión de tu operación.'}</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignUp && <label className="field-label" htmlFor="auth-name">Nombre<input id="auth-name" name="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={120} /></label>}
            <label className="field-label" htmlFor="auth-email">Correo electrónico<input id="auth-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength={254} /></label>
            <label className="field-label" htmlFor="auth-password">Contraseña<input id="auth-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={8} required /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <Button className="login-button" size="lg" type="submit" disabled={loading}>
              {loading ? 'Procesando…' : isSignUp ? 'Crear cuenta' : 'Ingresar a ECO ROUTE'}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
          <p className="auth-switch">
            {isSignUp ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}{' '}
            <Link href={isSignUp ? '/sign-in' : '/sign-up'}>{isSignUp ? 'Ingresar' : 'Crear cuenta'}</Link>
          </p>
        </div>
        <p className="login-footer">ECO ROUTE · Gestión de recorridos y flota</p>
      </section>
    </main>
  )
}
