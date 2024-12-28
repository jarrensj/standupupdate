'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import JSConfetti from 'js-confetti'

interface StandupUpdate {
  text: string;
  timestamp: string;
}

export default function StandupInput() {
  const [update, setUpdate] = useState('')
  const [savedUpdate, setSavedUpdate] = useState<StandupUpdate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const jsConfettiRef = useRef<JSConfetti | null>(null)

  useEffect(() => {
    jsConfettiRef.current = new JSConfetti();
    return () => {
      jsConfettiRef.current = null;
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('standupUpdate')
    if (stored) {
      setSavedUpdate(JSON.parse(stored))
    }
  }, [])

  const handleSave = () => {
    const updateData: StandupUpdate = {
      text: update,
      timestamp: new Date().toLocaleString()
    }
    localStorage.setItem('standupUpdate', JSON.stringify(updateData))
    setSavedUpdate(updateData)
    setUpdate('')
    setIsEditing(false)
    if (jsConfettiRef.current) {
      jsConfettiRef.current.addConfetti({
        emojis: ['🚀'],
        emojiSize: 100,
        confettiNumber: 24,
      })
    }
  }

  const handleEdit = () => {
    setUpdate(savedUpdate?.text || '')
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
          <CardDescription>
            {savedUpdate && !isEditing 
              ? `Last updated: ${savedUpdate.timestamp}`
              : 'Type your standup update'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isEditing && savedUpdate ? (
            <div className="flex flex-col gap-4">
              <p className="whitespace-pre-wrap">{savedUpdate.text}</p>
              <div className="flex gap-2">
                <Button onClick={handleEdit}>Edit Update</Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete Update
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Textarea
                placeholder="What did you work on yesterday? What are you working on today? Do you have any blockers?"
                value={update}
                onChange={(e) => setUpdate(e.target.value)}
                className="min-h-[200px] mb-4"
              />
              <Button onClick={handleSave} disabled={!update.trim()}>
                {isEditing ? 'Save Edit' : 'Save Update'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
