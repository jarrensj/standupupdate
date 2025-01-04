'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import JSConfetti from 'js-confetti'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

interface StandupUpdate {
  id?: string;
  text: string;
  created_at: string;
  updated_at?: string;
  user_id?: string;
}

export default function StandupInput() {
  const { user, isLoaded } = useUser()
  const [update, setUpdate] = useState('')
  const [savedUpdate, setSavedUpdate] = useState<StandupUpdate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const jsConfettiRef = useRef<JSConfetti | null>(null)

  useEffect(() => {
    jsConfettiRef.current = new JSConfetti();
    return () => {
      jsConfettiRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      const savedData = localStorage.getItem('standupUpdate');
      if (savedData) {
        setSavedUpdate(JSON.parse(savedData));
      } else {
        setSavedUpdate(null);
      }
      setIsEditing(false);
      setIsCreatingNew(false);
      setIsLoading(false);
    } 
    else {
      fetchUserUpdates();
    }
  }, [user, isLoaded]);

  const fetchUserUpdates = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) return;
      const response = await fetch(`/api/updates?user_id=${user.id}`);
      const data = await response.json();
      if (data.length > 0) {
        setSavedUpdate(data[0]);
        setIsCreatingNew(false);
        setIsEditing(false);
        setUpdate('');
      } else {
        setSavedUpdate(null);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
      setSavedUpdate(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const now = new Date().toISOString();
    const updateData: StandupUpdate = {
      text: update,
      created_at: savedUpdate?.created_at || now,
      ...(isEditing ? { updated_at: now } : {}),
      user_id: user?.id,
    };

    try {
      if (user) {
        const method = isEditing ? 'PUT' : 'POST';
        const response = await fetch('/api/updates', {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: update,
            user_id: user.id,
            ...(isEditing && savedUpdate?.id && { id: savedUpdate.id }),
          }),
        });

        if (!response.ok) throw new Error('Failed to save update');
        await fetchUserUpdates();
      } else {
        localStorage.setItem('standupUpdate', JSON.stringify(updateData));
        setSavedUpdate(updateData);
      }

      setUpdate('');
      setIsEditing(false);
      setIsCreatingNew(false);
      if (jsConfettiRef.current) {
        jsConfettiRef.current.addConfetti({
          emojis: ['🚀'],
          emojiSize: 100,
          confettiNumber: 24,
        })
      }
    } catch (error) {
      console.error('Error saving update:', error);
    }
  }

  const handleEdit = () => {
    if (savedUpdate) {
      setUpdate(savedUpdate.text);
      setIsEditing(true);
    }
  };

  const handleDelete = async () => {
    try {
      if (user && savedUpdate?.id) {
        const response = await fetch(`/api/updates?id=${savedUpdate.id}&user_id=${user.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete update');
      } else {
        localStorage.removeItem('standupUpdate');
      }
      setSavedUpdate(null);
    } catch (error) {
      console.error('Error deleting update:', error);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center w-full mb-2">
            <CardTitle>Standup Update</CardTitle>
            {savedUpdate && user && (
              <Button
                variant="outline"
                className="ml-4"
                onClick={() => {
                  setIsCreatingNew((prev) => !prev);
                  setIsEditing(false);
                  setUpdate('');
                }}
              >
                {isCreatingNew ? "View Latest Update" : "Create New Update"}
              </Button>
            )}
          </div>
          <CardDescription>
            {savedUpdate && !isEditing && !isCreatingNew
              ? (
                <>
                  Created: {new Date(savedUpdate.created_at).toLocaleString()}
                  <br />
                  {savedUpdate.updated_at && 
                    `Last updated: ${new Date(savedUpdate.updated_at).toLocaleString()}`}
                </>
              )
              : isCreatingNew
              ? 'Create a new update'
              : 'Type your standup update'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="min-h-[200px] flex items-center justify-center">
              Loading...
            </div>
          ) : (
            <>
              {savedUpdate && !isEditing && !isCreatingNew ? (
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
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={!update.trim()}>
                      {isEditing ? 'Save Edit' : 'Save Update'}
                    </Button>
                    {(isEditing || isCreatingNew) && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setIsCreatingNew(false);
                          setUpdate('');
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
      {user && (
        <div className="flex justify-end">
          <Link href="/updates" className="text-sm text-muted-foreground hover:text-foreground">
            View all updates →
          </Link>
        </div>
      )}
    </div>
  )
}
