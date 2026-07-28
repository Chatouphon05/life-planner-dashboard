import { useCalendarData } from '../hooks/useCalendarData.js';
import ConnectionBanner     from './ConnectionBanner.jsx';
import CalendarFilterPills  from './CalendarFilterPills.jsx';
import CalendarControls     from './CalendarControls.jsx';
import EventAgenda          from './EventAgenda.jsx';
import EventSchedule        from './EventSchedule.jsx';
import CalendarMonthGrid    from './CalendarMonthGrid.jsx';

export default function CalendarTab() {
  const cal = useCalendarData();

  return (
    <>
      <ConnectionBanner status={cal} onRefresh={cal.refetch} />

      {cal.connected && (
        <>
          <CalendarFilterPills
            calendars={cal.calendars}
            selectedIds={cal.selectedCalendarIds}
            onToggle={cal.toggleCalendar}
          />

          <CalendarControls
            view={cal.view}
            anchorDate={cal.anchorDate}
            onChangeView={cal.changeView}
            onToday={cal.goToday}
            onPrev={cal.goPrev}
            onNext={cal.goNext}
          />

          {cal.view === 'month' ? (
            <CalendarMonthGrid
              anchorDate={cal.anchorDate}
              events={cal.events}
              calendars={cal.calendars}
              loading={cal.eventsLoading}
              onSelectDay={(day) => { cal.goToDate(day); cal.changeView('day'); }}
            />
          ) : cal.view === 'day' ? (
            <EventAgenda
              events={cal.events}
              calendars={cal.calendars}
              loading={cal.eventsLoading}
              error={cal.eventsError}
              anchorDate={cal.anchorDate}
            />
          ) : (
            <EventSchedule
              events={cal.events}
              calendars={cal.calendars}
              loading={cal.eventsLoading}
              error={cal.eventsError}
            />
          )}
        </>
      )}
    </>
  );
}
