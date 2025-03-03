"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface UpdateDate {
  date?: string | null;
  created_at: string;
}

export default function Calendar() {
  const { user } = useUser()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [datesWithUpdates, setDatesWithUpdates] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

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
        const localFirstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const localLastDay = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        )

        const startUTC = new Date(localFirstDay.getTime() - localFirstDay.getTimezoneOffset() * 60000)
        const endUTC = new Date(localLastDay.getTime() - localLastDay.getTimezoneOffset() * 60000)

        const startUTCISO = startUTC.toISOString()
        const endUTCISO = endUTC.toISOString()

        const response = await fetch(
          `/api/updates?user_id=${encodeURIComponent(user.id)}&start_date=${encodeURIComponent(startUTCISO)}&end_date=${encodeURIComponent(endUTCISO)}&dates_only=true`
        )

        if (!response.ok) throw new Error("Failed to fetch update dates")

        const data = await response.json()
        const datesSet = new Set<string>()

        data.forEach((item: UpdateDate) => {
          // Use this column if they edited the date of the update, else use created date
          let formatted: string
          if (item.date) {
            formatted = item.date.split("T")[0]
          } else {
            const createdDate = new Date(item.created_at)
            formatted = formatLocalDate(createdDate)
          }
          datesSet.add(formatted)
        })
        setDatesWithUpdates(datesSet)
      } catch (error) {
        console.error("Error fetching dates with updates:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDatesWithUpdates()
  }, [currentDate, user])

  const monthName = currentDate.toLocaleString("default", { month: "long" })
  const year = currentDate.getFullYear()

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyCells = Array.from({ length: firstDayOfMonth }, (_, i) => i)

  const today = new Date()
  const isCurrentMonth =
    today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear()
  const currentDay = today.getDate()

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const hasUpdate = (day: number) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return datesWithUpdates.has(formatLocalDate(date))
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
            const isToday = isCurrentMonth && day === currentDay
            const dayHasUpdate = hasUpdate(day)

            return (
              <div key={`day-${day}`} className="h-10 flex items-center justify-center p-1">
                <div
                  className={cn(
                    "h-8 w-8 flex items-center justify-center text-sm rounded-full",
                    isToday && "border-2 border-primary font-medium",
                    dayHasUpdate && "bg-gray-200",
                    !dayHasUpdate && !isToday && "hover:bg-muted"
                  )}
                >
                  {day}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
