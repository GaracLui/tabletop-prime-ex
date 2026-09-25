'use client'

/**
 * QRCodeModal — generates a QR code from a URL and displays it in a dialog.
 * Uses the `qrcode` npm package (pure JS, no canvas dependency).
 */
import * as React from 'react'
import QRCode from 'qrcode'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy } from 'lucide-react'
import { copyToClipboard } from '@/lib/share/utils'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'

export function QRCodeModal({
  open,
  onOpenChange,
  url,
  label,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  label: string
}) {
  const { toast } = useToast()
  const { t } = useI18n()
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('')

  React.useEffect(() => {
    if (open && url) {
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setQrDataUrl).catch(() => setQrDataUrl(''))
    }
  }, [open, url])

  const handleCopy = async () => {
    const ok = await copyToClipboard(url)
    toast(ok ? { title: t('share.linkCopied') } : { title: t('share.copyFailed'), variant: 'destructive' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription className="sr-only">{t('share.qrDescription')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- QR code is a data URL
            <img src={qrDataUrl} alt={t('share.qrCodeAlt')} className="rounded-lg border" width={280} height={280} />
          ) : (
            <div className="h-[280px] w-[280px] animate-pulse rounded-lg bg-muted" />
          )}
          <Input value={url} readOnly className="text-center text-sm" />
          <Button size="sm" variant="outline" className="w-full" onClick={handleCopy}>
            <Copy className="mr-2 h-3.5 w-3.5" /> {t('share.copyLink')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
