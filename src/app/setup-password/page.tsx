'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetupPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: password,
    })

    if (error) {
      setMessage('Failed to set password. Please try again.')
      setLoading(false)
    } else {
      router.push('/onboarding')
    }
  }

  return (
    <div className="page-container justify-center">

      <div className="w-full max-w-sm space-y-8 animate-[fadeIn_0.6s_ease-out]">

        {/* HEADER */}
        <div className="text-center space-y-3">
          <h2 className="heading-xl">Secure account.</h2>
          <p className="body-text text-warm-grey">
            Create a password for easier access next time. You can always use a one-time code if you forget it.
          </p>
        </div>

        {/* FORM */}
        <form className="space-y-6" onSubmit={handleSetupPassword}>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Password (min. 8 chars)"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <input
              type="password"
              placeholder="Confirm password"
              className="input-field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={loading ? 'btn-disabled w-full' : 'btn-primary w-full'}
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>

        {/* ERROR MESSAGE */}
        {message && (
          <div className="p-4 border rounded-sm text-sm font-medium text-center animate-[fadeIn_0.3s_ease-out] bg-destructive/5 border-destructive/20 text-destructive">
            {message}
          </div>
        )}

      </div>
    </div>
  )
}
