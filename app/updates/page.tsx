'use client'

import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import JSConfetti from 'js-confetti';
import Link from "next/link";
import Calendar from "@/components/Calendar";
interface Update {
  id: number;
  created_at: Date;
  updated_at: Date;
  date: string;
  text: string;
  user_id: string;
}

export default function Updates() {
  const { user } = useUser();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const jsConfettiRef = useRef<JSConfetti | null>(null);
  const [editingUpdate, setEditingUpdate] = useState<Update | null>(null);

  useEffect(() => {
    jsConfettiRef.current = new JSConfetti();
    return () => {
      jsConfettiRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchUpdates();
    }
  }, [user]);

  const fetchUpdates = async () => {
    try {
      const response = await fetch(`/api/updates?user_id=${user?.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUpdates(data);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const handleEdit = async (updatedText: string, updatedDate: string) => {
    if (!editingUpdate || !user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/updates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingUpdate.id, 
          text: updatedText, 
          date: updatedDate,
          user_id: user.id 
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setEditingUpdate(null);
      fetchUpdates();
    } catch (error) {
      console.error('Error updating:', error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (updateId: number) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/updates?id=${updateId}&user_id=${user.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      fetchUpdates();
    } catch (error) {
      console.error('Error deleting:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Home
        </Link>
      </div>
      <SignedIn>
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-8">Standup Updates</h1>
          <Calendar />
        </div>
        
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Previous StandupUpdates</h2>
          <div className="space-y-4">
            {updates
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((update) => (
                <Card key={update.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardDescription>
                      <div className="font-semibold text-foreground">
                        {(() => {
                          const [year, month, day] = update.date.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          });
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Created: {new Date(update.created_at).toLocaleString('en-US', { timeZone: 'UTC' })}
                        {update.updated_at && update.updated_at !== update.created_at && (
                          <> · Last edited: {new Date(update.updated_at).toLocaleString('en-US', { timeZone: 'UTC' })}</>
                        )}
                      </div>
                    </CardDescription>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingUpdate(update)}
                      >
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your update.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(update.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editingUpdate?.id === update.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingUpdate.text}
                          onChange={(e) => setEditingUpdate({ ...editingUpdate, text: e.target.value })}
                          className="min-h-[100px]"
                        />
                        <input
                          type="date"
                          value={editingUpdate?.date || ''}
                          onChange={(e) => setEditingUpdate({ ...editingUpdate, date: e.target.value })}
                          className="border p-2"
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleEdit(editingUpdate.text, editingUpdate.date)}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Saving...' : 'Save'}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setEditingUpdate(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{update.text}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      </SignedIn>
      
      <SignedOut>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Please sign in to view standup updates</h1>
        </div>
      </SignedOut>
    </div>
  );
}