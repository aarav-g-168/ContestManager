export function getGoogleCalendarLink(
  title: string,
  start: string,
  durationSeconds: number,
  details: string
) {
  const startDate = new Date(start);

  const endDate = new Date(
    startDate.getTime() + durationSeconds * 1000
  );

  const formatDate = (date: Date) =>
    date.toISOString().replace(/-|:|\.\d+/g, "");

  return (
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${formatDate(startDate)}/${formatDate(endDate)}` +
    `&details=${encodeURIComponent(details)}`
  );
}