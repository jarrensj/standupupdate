"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"

interface UpdateDate {
  date?: string | null;
  created_at: string;
  text?: string;
  id?: number;
  updated_at?: string;
}

export default function Calendar() {
  const { user } = useUser()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [datesWithUpdates, setDatesWithUpdates] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedDayUpdate, setSelectedDayUpdate] = useState<string | null>(null)
  const [updatesData, setUpdatesData] = useState<Record<string, string>>({})

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() - 1)
      return newDate
    })
  }

  const goToNextMonth = () => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + 1)
      return newDate
    })
  }

  useEffect(() => {
    if (!user) return

    const fetchDatesWithUpdates = async () => {
      setIsLoading(true)
      try {
        const startDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const endDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const response = await fetch(
          `/api/updates?user_id=${encodeURIComponent(user.id)}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
        )

        if (!response.ok) throw new Error("Failed to fetch update dates")

        const data = await response.json()
        const datesSet = new Set<string>()
        const updatesMap: Record<string, string> = {}

        data.forEach((item: UpdateDate) => {
          if (item.date) {
            const formatted = item.date.split("T")[0]
            datesSet.add(formatted)
            
            if (item.text) {
              updatesMap[formatted] = item.text
            }
          }
        })
        setDatesWithUpdates(datesSet)
        setUpdatesData(updatesMap)
      } catch (error) {
        console.error("Error fetching dates with updates:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDatesWithUpdates()
  }, [currentDate, user])

  useEffect(() => {
    setSelectedDay(null)
    setSelectedDayUpdate(null)
  }, [currentDate])

  const monthName = currentDate.toLocaleString("default", { month: "long" })
  const year = currentDate.getFullYear()

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyCells = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const hasUpdate = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return datesWithUpdates.has(formatLocalDate(date))
  }

  const handleDayClick = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    const formattedDate = formatLocalDate(date)
    
    if (!datesWithUpdates.has(formattedDate)) {
      setSelectedDay(formattedDate)
      setSelectedDayUpdate(null)
      return
    }
    
    if (selectedDay === formattedDate) {
      setSelectedDay(null)
      setSelectedDayUpdate(null)
    } else {
      setSelectedDay(formattedDate)
      setSelectedDayUpdate(updatesData[formattedDate] || null)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto rounded-lg shadow-md overflow-hidden border border-border relative">
      <div className="bg-card p-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPreviousMonth} aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold text-card-foreground">
          {monthName} {year}
        </h2>
        <Button variant="ghost" size="icon" onClick={goToNextMonth} aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="bg-background p-4">
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground mb-2">Loading...</div>
        )}

        <div className="grid grid-cols-7 gap-0">
          {emptyCells.map((_, index) => (
            <div key={`empty-${index}`} className="h-10 p-0" />
          ))}

          {days.map((day) => {
            const dayHasUpdate = hasUpdate(day)
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
            const formattedDate = formatLocalDate(date)
            const isSelected = selectedDay === formattedDate

            return (
              <div 
                key={`day-${day}`} 
                className="h-10 flex items-center justify-center p-1"
                onClick={() => handleDayClick(day)}
              >
                <div
                  className={cn(
                    "h-8 w-8 flex items-center justify-center text-sm rounded-full",
                    dayHasUpdate && "bg-blue-500 text-white cursor-pointer",
                    isSelected && "bg-yellow-200 text-black",
                    isSelected && dayHasUpdate && "outline outline-2 outline-blue-500",
                    !dayHasUpdate && "hover:bg-muted",
                    isSelected && "hover:text-black"
                  )}
                >
                  {day}
                </div>
              </div>
            )
          })}
        </div>
        
        {selectedDay && (
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardDescription>
                <div className="font-semibold text-foreground">
                  {(() => {
                    const [year, month, day] = selectedDay.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    });
                  })()}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDayUpdate ? (
                <p className="whitespace-pre-wrap">{selectedDayUpdate}</p>
              ) : (
                <p className="text-muted-foreground">
                  No update found for {new Date(selectedDay + "T00:00:00").toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}