'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import JSConfetti from 'js-confetti'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FaMicrophoneAlt, FaMagic } from 'react-icons/fa'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronDown, ChevronRight } from 'lucide-react'

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
  const [savedUpdates, setSavedUpdates] = useState<StandupUpdate[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [showLatestUpdate, setShowLatestUpdate] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const jsConfettiRef = useRef<JSConfetti | null>(null)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isFormatting, setIsFormatting] = useState<boolean>(false);

  useEffect(() => {
    jsConfettiRef.current = new JSConfetti();
    return () => {
      jsConfettiRef.current = null;
    };
  }, []);

  const fetchUserUpdates = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!user?.id) return;
      const response = await fetch(`/api/updates?user_id=${user.id}`);
      const data = await response.json();
      if (data.length > 0) {
        setSavedUpdates(data.slice(0, 7));
        setIsEditing(false);
        setUpdate('');
      } else {
        setSavedUpdates([]);
      }
    } catch (error) {
      console.error('Error fetching updates:', error);
      setSavedUpdates([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      const savedData = localStorage.getItem('standupUpdate');
      if (savedData) {
        setSavedUpdates(JSON.parse(savedData));
      } else {
        setSavedUpdates([]);
      }
      setIsEditing(false);
      setIsLoading(false);
    } 
    else {
      fetchUserUpdates();
    }
  }, [user, isLoaded, fetchUserUpdates]);

  const handleSave = async () => {
    const now = new Date().toISOString();
    const updateData: StandupUpdate = {
      text: update,
      created_at: savedUpdates[0]?.created_at || now,
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
            ...(isEditing && savedUpdates[0]?.id && { id: savedUpdates[0].id }),
          }),
        });

        if (!response.ok) throw new Error('Failed to save update');
        await fetchUserUpdates();
      } else {
        localStorage.setItem('standupUpdate', JSON.stringify(updateData));
        setSavedUpdates([updateData]);
      }

      setUpdate('');
      setIsEditing(false);
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

  const handleDelete = async () => {
    try {
      if (user && savedUpdates[0]?.id) {
        const response = await fetch(`/api/updates?id=${savedUpdates[0].id}&user_id=${user.id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete update');
      } else {
        localStorage.removeItem('standupUpdate');
      }
      setSavedUpdates([]);
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

  const startRecording = async (shouldAppend = false) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        try {
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: audioBlob,
            headers: {
              'Content-Type': 'audio/webm',
            },
          });
          if (!response.ok) throw new Error('Transcription failed');
          
          const { text } = await response.json();
          if (shouldAppend) {
            setUpdate(prev => `${prev}\n\n${text}`);
          } else {
            setUpdate(text);
          }
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
      setIsTranscribing(true);
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const formatNote = async () => {
    if (!update.trim()) return;
    
    setIsFormatting(true);
    try {
      const response = await fetch('/api/format-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: update }),
      });
      
      if (!response.ok) throw new Error('Failed to format note');
      
      const { formattedText } = await response.json();
      setUpdate(formattedText);
    } catch (error) {
      console.error('Error formatting note:', error);
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl space-y-4">
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-3 space-y-4">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              {isTranscribing && (
                <div className="text-green-500 font-medium bg-green-50 px-3 py-1 rounded-md animate-pulse">
                  Transcribing...
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {isLoading ? (
            <div className="min-h-[200px] flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap gap-3">
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(value) => {
                    setSelectedMonth(parseInt(value));
                    setSelectedDate(new Date(selectedYear, parseInt(value), selectedDay).toISOString().split('T')[0]);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[200px]">
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
              <div className="relative">
                <Textarea
                  placeholder="What did you work on yesterday? What are you working on today? Do you have any blockers?"
                  value={update}
                  onChange={(e) => setUpdate(e.target.value)}
                  className="min-h-[200px] mb-6 text-lg leading-relaxed"
                />
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                {update.trim() && !isRecording ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                      >
                        <FaMicrophoneAlt />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <div className="flex justify-between items-start">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Voice Recording Options</AlertDialogTitle>
                          <AlertDialogDescription>
                            How would you like to add your voice recording?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-full"
                          onClick={() => document.querySelector<HTMLButtonElement>('[data-alert-dialog-cancel]')?.click()}
                        >
                          ✕
                        </Button>
                      </div>
                      <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="hidden" />
                        <Button
                          onClick={() => {
                            setTimeout(() => {
                              startRecording(false);
                            }, 100);
                          }}
                          variant="destructive"
                        >
                          Overwrite
                        </Button>
                        <Button
                          onClick={() => {
                            setTimeout(() => {
                              startRecording(true);
                            }, 100);
                          }}
                          variant="default"
                        >
                          Append
                        </Button>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <Button
                    variant="outline"
                    onClick={isRecording ? stopRecording : () => startRecording()}
                    className={isRecording ? "bg-red-100" : ""}
                  >
                    {isRecording ? 'Stop Recording' : <FaMicrophoneAlt />}
                  </Button>
                )}
                <TooltipProvider delayDuration={500}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={formatNote}
                        disabled={!update.trim() || isFormatting}
                        className={isFormatting ? "bg-blue-100" : ""}
                      >
                        {isFormatting ? 'Formatting...' : <FaMagic className="mr-2" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Format your update with AI</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex-1 flex flex-wrap justify-end gap-3 w-full sm:w-auto mt-3 sm:mt-0">
                  <Button 
                    size="lg" 
                    onClick={handleSave} 
                    disabled={!update.trim()} 
                    className="w-full sm:w-32"
                  >
                    {isEditing ? 'Save Edit' : 'Save Update'}
                  </Button>
                  {isEditing && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="hover:bg-secondary w-full sm:w-32"
                      onClick={() => {
                        setIsEditing(false);
                        setUpdate('');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
              
              {savedUpdates.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <button
                    onClick={() => setShowLatestUpdate(!showLatestUpdate)}
                    className="w-full flex items-center justify-between py-2 px-1 text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      {showLatestUpdate ? 
                        <ChevronDown className="h-4 w-4 transition-transform" /> : 
                        <ChevronRight className="h-4 w-4 transition-transform" />
                      }
                      <span className="font-medium">Previous Updates</span>
                    </div>
                    <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {showLatestUpdate ? "Click to hide" : "Click to view"}
                    </span>
                  </button>
                  
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      showLatestUpdate ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="max-h-[300px] overflow-y-auto">
                      {savedUpdates.map((update, index) => (
                        <div key={index} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md border border-slate-100 dark:border-slate-800 mb-3">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-muted-foreground">
                              {new Date(update.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </h3>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUpdate(update.text);
                                  setIsEditing(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete();
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                          <div className="prose prose-slate dark:prose-invert prose-sm max-w-none">
                            <p className="whitespace-pre-wrap text-muted-foreground">{update.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
