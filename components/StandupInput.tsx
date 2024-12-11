'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function StandupInput() {
  const [update, setUpdate] = useState('')
  const [savedUpdate, setSavedUpdate] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('standupUpdate')
    if (stored) {
      setSavedUpdate(stored)
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('standupUpdate', update)
    setSavedUpdate(update)
    setUpdate('')
    setIsEditing(false)
  }

  const handleEdit = () => {
    setUpdate(savedUpdate || '')
    setIsEditing(true)
  }

  const handleDelete = () => {
    localStorage.removeItem('standupUpdate')
    setSavedUpdate(null)
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
          <Button onClick={handleSave} disabled={!update.trim()}>
            {isEditing ? 'Save Edit' : 'Save Update'}
          </Button>
        </CardContent>
      </Card>

      {savedUpdate && !isEditing && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Saved Standup Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="whitespace-pre-wrap">{savedUpdate}</p>
              <div className="flex gap-2">
                <Button onClick={handleEdit}>Edit Update</Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete Update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
