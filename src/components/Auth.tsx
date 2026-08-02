import { FormEvent, useState } from 'react'
import { BarChart3, ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const productionUrl = 'https://dashboard-estadisticas-7pn.pages.dev'
const authRedirectUrl = ['localhost', '127.0.0.1'].includes(location.hostname)
  ? location.origin
  : productionUrl

export function Auth() {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    let error

    if (mode === 'login') {
      ;({ error } = await supabase.auth.signInWithPassword({ email, password }))
    } else if (mode === 'register') {
      ;({ error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name }, emailRedirectTo: authRedirectUrl },
      }))
    } else {
      ;({ error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirectUrl,
      }))
    }

    setMessage(
      error
        ? error.message
        : mode === 'reset'
          ? 'Revisá tu correo para continuar.'
          : mode === 'register'
            ? 'Cuenta creada. Revisá tu correo para confirmar tu email.'
            : '',
    )
    setBusy(false)
  }

  return <div className="auth-page">
    <div className="auth-brand">
      <img src="/brand/jcb-wordmark.png" alt="JCB Developement" />
      <span>Gestión financiera, simple y precisa.</span>
    </div>
    <form className="auth-card" onSubmit={submit}>
      {mode === 'reset' && <button type="button" className="auth-back" onClick={() => setMode('login')}><ChevronLeft />Volver</button>}
      <div className="auth-icon"><BarChart3 /></div>
      <h1>{mode === 'login' ? 'Bienvenido' : mode === 'register' ? 'Crear cuenta' : 'Recuperar acceso'}</h1>
      <p>{mode === 'login' ? 'Ingresá para administrar tu negocio.' : mode === 'register' ? 'Empezá a controlar tus finanzas.' : 'Te enviaremos un enlace de recuperación.'}</p>
      {mode === 'register' && <label>Nombre<input required value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" /></label>}
      <label>Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@empresa.com" /></label>
      {mode !== 'reset' && <label>Contraseña<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></label>}
      {message && <div className="auth-message">{message}</div>}
      <button className="primary auth-submit" disabled={busy}>{busy ? <Loader2 className="spin" /> : mode === 'login' ? 'Ingresar' : mode === 'register' ? 'Registrarme' : 'Enviar enlace'}</button>
      {mode === 'login' && <button type="button" className="auth-link" onClick={() => setMode('reset')}>¿Olvidaste tu contraseña?</button>}
      <div className="auth-switch">{mode === 'register' ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'} <button type="button" onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Ingresar' : 'Registrarme'}</button></div>
    </form>
  </div>
}
