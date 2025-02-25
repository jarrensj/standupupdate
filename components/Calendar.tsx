'use client'

import { useEffect, useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { useUser } from '@clerk/nextjs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import React from 'react'

const WEEKS_IN_YEAR = 52
const WEEK_WIDTH = 13 

interface Update {
  date: string
}

interface CalendarDay {
  date: dayjs.Dayjs
  hasUpdate: boolean
}

interface CalendarRow {
  dayName: string
  dates: CalendarDay[]
}

function getStartDate(): dayjs.Dayjs {
  const now = dayjs()
  const diff = (now.day() + 6) % 7
  const monday = now.subtract(diff, 'day')
  return monday.subtract(WEEKS_IN_YEAR - 1, 'week')
}

function generateCalendarData(startDate: dayjs.Dayjs, updates: Update[]): CalendarRow[] {
  const daysOfWeek = ['M', '', 'W', '', 'F']
  const updateDates = new Set(updates.map(update => dayjs(update.date).format('YYYY-MM-DD')))
  const calendar: CalendarRow[] = []

  for (let dayIndex = 0; dayIndex < daysOfWeek.length; dayIndex++) {
    const row: CalendarDay[] = []

    let currentDate = startDate
    while (currentDate.day() !== (dayIndex + 1)) {
      currentDate = currentDate.add(1, 'day')
    }

    for (let week = 0; week < WEEKS_IN_YEAR; week++) {
      row.push({
        date: currentDate,
        hasUpdate: updateDates.has(currentDate.format('YYYY-MM-DD'))
      })
      currentDate = currentDate.add(1, 'week')
    }
    calendar.push({
      dayName: daysOfWeek[dayIndex],
      dates: row
    })
  }
  return calendar
}

function generateMonthLabels(startDate: dayjs.Dayjs): React.JSX.Element[] {
  let currentDate = startDate
  let currentMonth = currentDate.month()
  let weekCounter = 0
  let monthWeeks = 0
  const labels: React.JSX.Element[] = []

  for (let week = 0; week < WEEKS_IN_YEAR; week++) {
    if (currentDate.month() !== currentMonth || week === WEEKS_IN_YEAR - 1) {
      const labelDate = currentDate.subtract(Math.floor(monthWeeks / 2) + 1, 'week')
      labels.push(
        <div 
          key={weekCounter} 
          className="text-xs text-muted-foreground"
          style={{ 
            width: `${monthWeeks * WEEK_WIDTH}px`,
            textAlign: 'center'
          }}
        >
          {labelDate.format('MMM')}
        </div>
      )
      monthWeeks = 1
      currentMonth = currentDate.month()
    } else {
      monthWeeks++
    }
    currentDate = currentDate.add(1, 'week')
    weekCounter++
  }
  return labels
}

export default function Calendar() {
  const { user } = useUser()
  const [updates, setUpdates] = useState<Update[]>([])
  const [loading, setLoading] = useState(true)

  const startDate = useMemo(() => getStartDate(), [])

  useEffect(() => {
    const fetchUpdates = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }
      
      try {
        const response = await fetch(`/api/updates?user_id=${user.id}&start_date=${startDate.toISOString()}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setUpdates(data)
      } catch (error) {
        console.error('Error fetching updates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUpdates()
  }, [user, startDate])

  const calendarData = useMemo(() => generateCalendarData(startDate, updates), [startDate, updates])
  const monthLabels = useMemo(() => generateMonthLabels(startDate), [startDate])
  const totalUpdates = updates.length

  const formatTooltipDate = (date: dayjs.Dayjs) => {
    return date.format('MMMM D')
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user?.id) {
    return <div>Please log in</div>
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="w-full relative">
        <h2 className="font-semibold mb-3">
          {totalUpdates} update{totalUpdates !== 1 ? 's' : ''} in the last year
        </h2>
        <div className="w-full -mx-4 sm:mx-0">
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[750px] w-fit px-4 sm:px-0 mx-auto">
              <div className="inline-flex flex-col gap-[3px]">
                <div className="flex items-center">
                  <span className="w-8 shrink-0" /> 
                  <div className="flex pl-2">
                    {monthLabels}
                  </div>
                </div>
                {calendarData.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center h-[15px]">
                    <span className="w-8 shrink-0 text-xs text-muted-foreground pr-2">
                      {row.dayName}
                    </span>
                    <div className="flex gap-[3px]">
                      {row.dates.map((day, dayIndex) => (
                        <Tooltip key={dayIndex}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-[10px] h-[10px] rounded-[2px] border border-[rgba(27,31,35,0.06)] ${
                                day.hasUpdate 
                                  ? 'bg-foreground hover:border-gray-400' 
                                  : 'bg-[#ebedf0] hover:border-gray-400'
                              }`}
                            />
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top"
                            className="z-50"
                          >
                            <p>
                              {day.hasUpdate 
                                ? `1 update on ${formatTooltipDate(day.date)}`
                                : `No updates on ${formatTooltipDate(day.date)}`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
