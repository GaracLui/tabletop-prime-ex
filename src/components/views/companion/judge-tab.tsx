'use client'

/**
 * JudgeTab — player pages a judge for their table by category
 * (Score dispute / Rule question / Other).
 *
 * Extracted from companion-view.tsx.
 */
import * as React from 'react'
import { Bell } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/hooks/use-i18n'
import { useCreateJudgeCall } from '@/hooks/use-event-data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function JudgeTab({ eventId, event }: { eventId: string; event: any }) {
  const { t } = useI18n()
  const createCall = useCreateJudgeCall(eventId)
  const { toast } = useToast()

  const currentRound = event.pairings?.find((p: any) => p.round === event.currentRound)
  const [selectedTable, setSelectedTable] = React.useState('')

  React.useEffect(() => {
    if (currentRound && currentRound.tables.length > 0 && !selectedTable) {
      setSelectedTable(String(currentRound.tables[0].tableNumber))
    }
  }, [currentRound, selectedTable])

  const callJudge = async (category: string) => {
    if (!selectedTable) {
      toast({ title: t('companion.selectTableFirst'), variant: 'destructive' })
      return
    }
    try {
      await createCall.mutateAsync({
        tableNumber: Number(selectedTable),
        category,
      })
      toast({ title: t('companion.callSent').replace('{table}', selectedTable) })
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" /> {t('companion.callJudge')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentRound && (
          <div className="space-y-1.5">
            <Label>{t('companion.yourTable')}</Label>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {currentRound.tables.map((tbl: any) => (
                  <SelectItem key={tbl.tableNumber} value={String(tbl.tableNumber)}>
                    {t('dashboard.roundStatusTable').replace('{n}', String(tbl.tableNumber))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={() => callJudge('SCORE')} disabled={createCall.isPending}>
            {t('companion.categoryScore')}
          </Button>
          <Button variant="outline" onClick={() => callJudge('RULE')} disabled={createCall.isPending}>
            {t('companion.categoryRule')}
          </Button>
          <Button variant="outline" onClick={() => callJudge('OTHER')} disabled={createCall.isPending}>
            {t('companion.categoryOther')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
