'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import JSConfetti from 'js-confetti'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FaMicrophoneAlt } from 'react-icons/fa'

interface StandupUpdate {
  id?: string;
  text: string;
  created_at: string;
  updated_at?: string;
  user_id?: string;
  date: string;
}

export default function StandupInput() {
  const { user, isLoaded } = useUser()
  const [update, setUpdate] = useState('')
  const [savedUpdate, setSavedUpdate] = useState<StandupUpdate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const jsConfettiRef = useRef<JSConfetti | null>(null)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

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
      date: new Date(selectedDate).toISOString(),
      user_id: user?.id,
      ...(isEditing ? { updated_at: now } : {})
    };

    try {
      if (user) {
        const response = await fetch('/api/updates', {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: update,
            user_id: user.id,
            date: new Date(selectedYear, selectedMonth, selectedDay).toISOString(),
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

  const generateMonthOptions = () => {
    return [
      { value: 0, label: 'January' },
      { value: 1, label: 'February' },
      { value: 2, label: 'March' },
      { value: 3, label: 'April' },
      { value: 4, label: 'May' },
      { value: 5, label: 'June' },
      { value: 6, label: 'July' },
      { value: 7, label: 'August' },
      { value: 8, label: 'September' },
      { value: 9, label: 'October' },
      { value: 10, label: 'November' },
      { value: 11, label: 'December' }
    ];
  };

  const generateDayOptions = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      value: i + 1,
      label: (i + 1).toString()
    }));
  };

  const generateYearOptions = () => {
    return [
      { value: 2024, label: "2024" },
      { value: 2025, label: "2025" }
    ];
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        try {
          setIsTranscribing(true);
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: audioBlob,
            headers: {
              'Content-Type': 'audio/webm',
            },
          });
          if (!response.ok) throw new Error('Transcription failed');
          
          const { text } = await response.json();
          setUpdate(text);
        } catch (error) {
          console.error('Transcription error:', error);
        } finally {
          setIsTranscribing(false);
        }
      };
      
      recorder.start();
      setIsRecording(true);
      setMediaRecorder(recorder);
    } catch (error) {
      alert('Failed to start recording');
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-4">
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-3 space-y-4">
          <div className="flex justify-between items-center w-full">
            {savedUpdate && !isEditing && !isCreatingNew && (
              <h3 className="text-xl font-semibold text-primary">
                {new Date(savedUpdate.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
            )}
            {savedUpdate && user && (
              <Button
                variant="outline"
                className="hover:bg-secondary"
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
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <>
              {savedUpdate && !isEditing && !isCreatingNew ? (
                <div className="space-y-8">
                  <div className="border-b pb-4">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-base text-muted-foreground">
                        {isCreatingNew
                          ? 'Create a new update'
                          : savedUpdate && !isEditing
                          ? 'Your most recently created update'
                          : 'Type your standup update'}
                      </CardDescription>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={handleEdit}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none">
                    <p className="whitespace-pre-wrap leading-relaxed text-lg">{savedUpdate.text}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6 flex gap-3">
                    <Select
                      value={selectedMonth.toString()}
                      onValueChange={(value) => {
                        setSelectedMonth(parseInt(value));
                        setSelectedDate(new Date(selectedYear, parseInt(value), selectedDay).toISOString().split('T')[0]);
                      }}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateMonthOptions().map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedDay.toString()}
                      onValueChange={(value) => {
                        setSelectedDay(parseInt(value));
                        setSelectedDate(new Date(selectedYear, selectedMonth, parseInt(value)).toISOString().split('T')[0]);
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateDayOptions().map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={selectedYear.toString()}
                      onValueChange={(value) => {
                        setSelectedYear(parseInt(value));
                        setSelectedDate(new Date(parseInt(value), selectedMonth, selectedDay).toISOString().split('T')[0]);
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateYearOptions().map((year) => (
                          <SelectItem key={year.value} value={year.value.toString()}>
                            {year.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    placeholder={isTranscribing 
                      ? "Transcribing..." 
                      : "What did you work on yesterday? What are you working on today? Do you have any blockers?"}
                    value={update}
                    onChange={(e) => setUpdate(e.target.value)}
                    className="min-h-[200px] mb-6 text-lg leading-relaxed"
                  />
                  <div className="flex gap-3 items-center">
                  <Button
                    variant="outline"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={isRecording ? "bg-red-100" : ""}
                  >
                    {isRecording ? 'Stop Recording' : <FaMicrophoneAlt />}
                  </Button>
                    <div className="flex-1 flex justify-end gap-3">
                      <Button size="lg" onClick={handleSave} disabled={!update.trim()} className="w-32">
                        {isEditing ? 'Save Edit' : 'Save Update'}
                      </Button>
                      {(isEditing || isCreatingNew) && (
                        <Button
                          size="lg"
                          variant="outline"
                          className="hover:bg-secondary w-32"
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
