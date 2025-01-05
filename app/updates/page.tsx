'use client'

import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import JSConfetti from 'js-confetti';
import Link from "next/link";

interface Update {
  id: number;
  created_at: Date;
  updated_at: Date;
  date: Date;
  text: string;
  user_id: string;
}

export default function Updates() {
  const { user } = useUser();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [newUpdate, setNewUpdate] = useState('');
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

  const handleSave = async () => {
    if (!user || !newUpdate.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: newUpdate, 
          user_id: user.id,
          date: new Date().toISOString()
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setNewUpdate('');
      fetchUpdates();

      if (jsConfettiRef.current) {
        jsConfettiRef.current.addConfetti({
          emojis: ['🚀'],
          emojiSize: 100,
          confettiNumber: 24,
        });
      }
    } catch (error) {
      console.error('Error saving update:', error);
    }
    setIsLoading(false);
  };

  const handleEdit = async (updatedText: string) => {
    if (!editingUpdate || !user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/updates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editingUpdate.id, 
          text: updatedText, 
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
        <h1 className="text-3xl font-bold mb-8">Standup Updates</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>New Update</CardTitle>
            <CardDescription>
              Type your standup update
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="What did you work on yesterday? What are you working on today? Do you have any blockers?"
              value={newUpdate}
              onChange={(e) => setNewUpdate(e.target.value)}
              className="min-h-[200px] mb-4"
            />
            <Button 
              onClick={handleSave} 
              disabled={!newUpdate.trim() || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Update'}
            </Button>
          </CardContent>
        </Card>
        
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Previous StandupUpdates</h2>
          <div className="space-y-4">
            {updates
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((update) => (
                <Card key={update.id}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardDescription>
                      <div>Update for: {new Date(update.date).toLocaleDateString()}</div>
                      <div className="text-xs">
                        Created: {new Date(update.created_at).toLocaleString()}
                        {update.updated_at && update.updated_at !== update.created_at && (
                          <> · Last edited: {new Date(update.updated_at).toLocaleString()}</>
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
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleEdit(editingUpdate.text)}
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