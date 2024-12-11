'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function StandupInput() {
  const [update, setUpdate] = useState('')
  const [savedUpdate, setSavedUpdate] = useState<string | null>(null)

  const handleSave = () => {
    setSavedUpdate(update)
    setUpdate('')
  }

  return (
    <div className="w-full max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Standup Update</CardTitle>
          <CardDescription>Type your standup update</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="What did you work on yesterday? What are you working on today? Do you have any blockers?"
            value={update}
            onChange={(e) => setUpdate(e.target.value)}
            className="min-h-[200px] mb-4"
          />
          <Button onClick={handleSave} disabled={!update.trim()}>Save Update</Button>
        </CardContent>
      </Card>

      {savedUpdate && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Saved Standup Update</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{savedUpdate}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
