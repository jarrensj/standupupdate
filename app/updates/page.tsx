'use client'

import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import JSConfetti from 'js-confetti';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface Update {
  id: number;
  created_at: Date;
  text: string;
  user_id: string;
}

export default function Updates() {
  const { user } = useUser();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const jsConfettiRef = useRef<JSConfetti | null>(null);

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
                <CardHeader>
                  <CardDescription>
                    {new Date(update.created_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{update.text}</p>
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