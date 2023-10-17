import logo from './logo.svg'
import './App.css'

import Moment from 'moment-timezone'
import { extendMoment } from 'moment-range'
import { range, get, find, first, difference, chain, flatten } from 'lodash'
import { useState } from 'react'

const moment = extendMoment(Moment)
const blocks = [{
  days: [1, 2, 3, 4, 5],
  start: '09:00',
  end: '17:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
}]

function App () {
  const [month, setMonth] = useState(null)

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const calendar = getCalendar(blocks, timezone, month, 30)
  const monthMoment = month ? moment(`${month}-01`) : moment()
  const days = get(calendar, 'dates') || []
  const startOfMonth = monthMoment.clone().startOf('month')
  const monthSpacerDays = range(startOfMonth.weekday())
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  let previousMonth = startOfMonth.clone().subtract(1, 'month').endOf('month')
  previousMonth = previousMonth.isAfter(moment()) ? previousMonth.format('YYYY-MM') : undefined
  let nextMonth = startOfMonth.clone().add(1, 'month')
  nextMonth = moment().add(6, 'month').endOf('month').isAfter(nextMonth) ? nextMonth.format('YYYY-MM') : undefined
  const monthDisplay = monthMoment.format('MMMM YYYY')

  function selectDate (day) {
    console.log('selectDate', day)
  }

  function dayClass (day) {
    let names = 'day-text-wrapper'
    if (day.today) {
      names += ' day-today'
    }
    if (!day.times.length) {
      names += ' day-unavailable'
    }
    return names
  }

  const weekDayItems = weekDays.map(weekDay =>
    <div className="days-width" key={weekDay}>{weekDay}</div>
  )
  const monthSpacerDayItems = monthSpacerDays.map(spacerDay =>
    <div className="days-width" key={spacerDay}></div>
  )

  const dayItems = days.map(d =>
    <div key={d.day} className="days-width">
      <button className="btn-day" disabled={!d.times.length} onClick={() => selectDate(d)}>
        <div className={dayClass(d)}>
          <div className="day-text">
            {d.dayOfMonth}
          </div>
        </div>
      </button>
    </div>
  )

  return (
    <div className="calendar-wrapper">
      <b-row align-v="center">
        <b-col>
          <h3 className="mb-2">
            {monthDisplay}
          </h3>
        </b-col>
        <b-col cols="auto" className="mb-3">
          <button variant="default" disabled={!previousMonth} onClick={() => setMonth(previousMonth)}>
            <svg xmlns="http://www.w3.org/2000/svg" height="1em"
                 viewBox="0 0 320 512">
              <path
                d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"/>
            </svg>
          </button>
          <button variant="default" disabled={!nextMonth} onClick={() => setMonth(nextMonth)}>
            <svg xmlns="http://www.w3.org/2000/svg" height="1em"
                 viewBox="0 0 320 512">
              <path
                d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"/>
            </svg>
          </button>
        </b-col>
      </b-row>
      <div>
        {weekDayItems}
      </div>
      <div>
        {monthSpacerDayItems}
        {dayItems}
      </div>
    </div>
  )
}

function getCalendar (blocks, timezone, month, duration = 30) {
  const start = month
    ? moment.tz(`${month}-01`, timezone).startOf('month')
    : moment.tz(timezone).startOf('month')
  const previousMonth = start.clone().subtract(1, 'month').endOf('month')
  const nextMonth = start.clone().add(1, 'month')

  return {
    timezone: timezone,
    month: start.format('YYYY-MM'),
    previousMonth: previousMonth.isAfter(moment()) ? previousMonth.format('YYYY-MM') : undefined,
    nextMonth: moment().add(6, 'month').endOf('month').isAfter(nextMonth) ? nextMonth.format('YYYY-MM') : undefined,
    firstWeekday: start.weekday(), // This is used for spacing the first day button on the frontend
    dates: getCalendarDates(blocks, timezone, start, duration)
  }
}

function getCalendarDates (blocks, timezone, start, duration) {
  // const timezone = 'America/Santiago'

  const now = moment()
  const meetings = [] // await Meeting.find({ attendees: { $in: user._id } })

  const meetingsTimes = chain(meetings).map(meeting => {
    const start = moment(meeting.start)
    // Doesn't allow booking on ending time to give gap between meetings
    return Array.from(moment.range(start.clone().subtract(duration, 'minutes'), start.clone().add(meeting.duration, 'minutes'))
      .by('minute', { step: 30 }))
      .map(m => {
        return {
          unix: m.unix(),
          users: meeting.attendees.map(a => a.id)
        }
      })
  }).flatten().groupBy('unix').map(times => {
    return {
      unix: first(times).unix,
      users: flatten(times.map(t => t.users))
    }
  }).value()

  const monthRange = moment.range(
    start.clone().startOf('month'),
    start.clone().endOf('month')
  )
  // Each day of the month with the time slots and the users available at that time
  return Array.from(monthRange.by('day')).map(day => {
    const dayBlocks = blocks.filter(b => b.days.includes(day.weekday()))
    const times = chain(dayBlocks).map(block => {
      const date = day.format('YYYY-MM-DD')
      const start = moment.tz(`${date} ${block.start}`, block.timezone).tz(timezone)
      const end = moment.tz(`${date} ${block.end}`, block.timezone).tz(timezone).subtract(duration, 'minutes')
      // Time slots from a users block
      return Array.from(moment.range(start, end).by('minute', { step: 30 })).map(time => {
        return {
          unix: time.unix(),
          display: time.format('h:mm a'),
          user: String(block.user)
        }
      })
      // Flatten to turn list of block list of times slots into list of time slots
      // Then groupBy and "merge" to get the list of users for each timeslot
    }).flatten().groupBy('unix').map(times => {
      const busyUsers = get(find(meetingsTimes, { unix: first(times).unix }), 'users') || []
      return {
        unix: first(times).unix,
        display: first(times).display,
        users: difference(times.map(t => t.user), busyUsers)
      }
    }).filter(t => {
      // Filter out slots with no available users and slots that are too soon or in past
      // default to 16 hours ahead of time
      return t.users.length && now.unix() + 3600 * 16 < t.unix
    }).sortBy('unix').value()
    return {
      today: day.isSame(moment(), 'day'),
      day: day.format('YYYY-MM-DD'),
      dayOfMonth: day.format('D'),
      display: day.format('ddd, MMM D'),
      times: times
    }
  })
}

export default App
