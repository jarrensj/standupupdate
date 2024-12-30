'use client'

import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import JSConfetti from 'js-confetti';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Update {
  id: number;
  created_at: Date;
  updated_at: Date;
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
    const { data, error } = await supabase
      .from('standupupdates')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching updates:', error);
      return;
    }

    setUpdates(data || []);
  };

  const handleSave = async () => {
    if (!user || !newUpdate.trim()) return;
    
    setIsLoading(true);
    const { error } = await supabase
      .from('standupupdates')
      .insert([
        {
          text: newUpdate,
          user_id: user.id,
          created_at: new Date().toISOString()
        }
      ]);

    setIsLoading(false);

    if (error) {
      console.error('Error saving update:', error);
      return;
    }

    setNewUpdate('');
    fetchUpdates();

    if (jsConfettiRef.current) {
      jsConfettiRef.current.addConfetti({
        emojis: ['🚀'],
        emojiSize: 100,
        confettiNumber: 24,
      });
    }
  };

  const handleEdit = async (updatedText: string) => {
    if (!editingUpdate || !user) return;
    
    setIsLoading(true);
    const { error } = await supabase
      .from('standupupdates')
      .update({ 
        text: updatedText,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingUpdate.id)
      .eq('user_id', user.id);

    setIsLoading(false);

    if (error) {
      console.error('Error updating:', error);
      return;
    }

    setEditingUpdate(null);
    fetchUpdates();
  };

  const handleDelete = async (updateId: number) => {
    if (!user) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('standupupdates')
      .delete()
      .eq('id', updateId)
      .eq('user_id', user.id);

    setIsLoading(false);

    if (error) {
      console.error('Error deleting:', error);
      return;
    }

    fetchUpdates();
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
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
            {updates.map((update) => (
              <Card key={update.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardDescription>
                    Created: {new Date(update.created_at).toLocaleString()}
                    {update.updated_at && update.updated_at !== update.created_at && (
                      <> Last edited: {new Date(update.updated_at).toLocaleString()}</>
                    )}
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