'use client'

/**
 * AccountView — manage the current user's profile, password, and account
 * deletion request. Self-contained: doesn't touch tournament data.
 *
 * Three sections:
 *   - Profile card    — display name + tier (read-only for now)
 *   - Password card   — change password (current + new + confirm)
 *   - Danger zone     — request GDPR deletion (irreversible within 30 days)
 */
import * as React from 'react'
import { useAuth } from '@/components/auth/auth-provider'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User as UserIcon, KeyRound, AlertTriangle, Save, ShieldCheck } from 'lucide-react'
import { fetchJson } from '@/hooks/use-event-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccountUser {
  id: string
  email: string
  name: string | null
  primeTier: string
  deletionRequestedAt: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function AccountView() {
  const { t } = useI18n()
  const { user: authUser } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['account'],
    queryFn: () => fetchJson('/api/account').then((d) => d.user as AccountUser),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="animate-pulse text-muted-foreground">{t('account.loading')}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t('account.notFound')}
          </CardContent>
        </Card>
      </div>
    )
  }

  const displayName = data.name || authUser?.name || authUser?.email?.split('@')[0] || t('common.rolePlayer')

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('nav.account')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('account.subtitle')}
        </p>
      </div>

      <ProfileCard user={data} displayName={displayName} />
      <PasswordCard user={data} />
      <DangerZoneCard user={data} qc={qc} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Profile card
// ---------------------------------------------------------------------------

function ProfileCard({
  user,
  displayName,
}: {
  user: AccountUser
  displayName: string
}) {
  const { t } = useI18n()
  const qc = useQueryClient()
  const { toast } = useToast()
  const [name, setName] = React.useState(user.name ?? '')
  const [dirty, setDirty] = React.useState(false)

  // Re-sync when server data changes (e.g. after a refetch)
  React.useEffect(() => {
    setName(user.name ?? '')
    setDirty(false)
  }, [user.name])

  const mutation = useMutation({
    mutationFn: (input: { name: string }) =>
      fetchJson('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account'] })
      toast({ title: t('account.profile.updated') })
      setDirty(false)
    },
  })

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({ name: name.trim() })
    } catch (err: any) {
      toast({ title: err.message || t('account.profile.updateFailed'), variant: 'destructive' })
    }
  }

  const handleReset = () => {
    setName(user.name ?? '')
    setDirty(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserIcon className="h-4 w-4" /> {t('account.profile.title')}
        </CardTitle>
        <CardDescription>{t('account.profile.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <Input id="email" value={user.email} readOnly disabled className="bg-muted/40" />
          <p className="text-xs text-muted-foreground">
            {t('account.profile.emailHelp')}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t('account.profile.displayName')}</Label>
          <Input
            id="name"
            value={name}
            maxLength={80}
            placeholder={displayName}
            onChange={(e) => { setName(e.target.value); setDirty(true) }}
            aria-invalid={false}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('account.profile.primeTier')}</Label>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">{user.primeTier}</Badge>
            <span className="text-xs text-muted-foreground">
              {t('account.profile.tierUpgrades')}
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          {dirty && <Button variant="ghost" size="sm" onClick={handleReset}>{t('common.reset')}</Button>}
          <Button size="sm" onClick={handleSave} disabled={!dirty || mutation.isPending}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> {t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Password card
// ---------------------------------------------------------------------------

function PasswordCard({ user }: { user: AccountUser }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [current, setCurrent] = React.useState('')
  const [next, setNext] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [showCurrent, setShowCurrent] = React.useState(false)

  const matches = next.length > 0 && next === confirm
  const tooShort = next.length > 0 && next.length < 6
  const sameAsCurrent = current.length > 0 && current === next
  const canSubmit = current && next && confirm && matches && !tooShort && !sameAsCurrent

  const mutation = useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      fetchJson('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      toast({ title: t('account.password.changed') })
      setCurrent(''); setNext(''); setConfirm('')
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    try {
      await mutation.mutateAsync({ currentPassword: current, newPassword: next })
    } catch (err: any) {
      toast({ title: err.message || t('account.password.changeFailed'), variant: 'destructive' })
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="h-4 w-4" /> {t('auth.password')}
        </CardTitle>
        <CardDescription>{t('account.password.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-pw">{t('account.password.current')}</Label>
            <div className="relative">
              <Input
                id="current-pw"
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center text-xs text-muted-foreground hover:text-foreground"
                aria-label={showCurrent ? t('account.password.hide') : t('account.password.show')}
                aria-pressed={showCurrent}
              >
                {showCurrent ? t('account.password.hide') : t('account.password.show')}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-pw">{t('account.password.new')}</Label>
            <Input
              id="new-pw"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
              aria-invalid={tooShort || sameAsCurrent}
            />
            {tooShort && <p className="text-xs text-amber-700 dark:text-amber-400">{t('account.password.tooShort')}</p>}
            {sameAsCurrent && <p className="text-xs text-amber-700 dark:text-amber-400">{t('account.password.mustDiffer')}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-pw">{t('account.password.confirm')}</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              aria-invalid={confirm.length > 0 && !matches}
            />
            {confirm.length > 0 && !matches && <p className="text-xs text-amber-700 dark:text-amber-400">{t('account.password.mismatch')}</p>}
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={!canSubmit || mutation.isPending}>
              {t('account.password.submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Danger zone
// ---------------------------------------------------------------------------

function DangerZoneCard({ user, qc }: { user: AccountUser; qc: ReturnType<typeof useQueryClient> }) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)

  const mutation = useMutation({
    mutationFn: () => fetchJson('/api/account/delete', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account'] })
      toast({
        title: t('account.danger.requestedTitle'),
        description: t('account.danger.requestedDescription'),
      })
      setOpen(false)
    },
  })

  const handleConfirm = async () => {
    try {
      await mutation.mutateAsync()
    } catch (err: any) {
      toast({ title: err.message || t('account.danger.requestFailed'), variant: 'destructive' })
    }
  }

  const requestedAt = user.deletionRequestedAt ? new Date(user.deletionRequestedAt) : null
  const wipeBy = requestedAt
    ? new Date(requestedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null

  return (
    <Card className="mt-6 border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-4 w-4 text-destructive" /> {t('account.danger.title')}
        </CardTitle>
        <CardDescription>
          {t('account.danger.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requestedAt ? (
          <div className="space-y-3">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-sm">
              <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                <ShieldCheck className="h-4 w-4" />
                {t('account.danger.requestedOn').replace('{date}', requestedAt.toLocaleDateString())}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('account.danger.wipeBy').replace('{date}', wipeBy?.toLocaleDateString() ?? '')}
              </p>
            </div>
          </div>
        ) : (
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                {t('account.danger.requestButton')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('account.danger.dialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('account.danger.dialogDescription1')}
                  <br /><br />
                  {t('account.danger.dialogDescription2')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirm}
                  disabled={mutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('account.danger.confirmButton')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  )
}
