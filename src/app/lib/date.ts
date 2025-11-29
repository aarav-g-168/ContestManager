export function parseAsUTC(dateString: string): Date {
  if (!dateString) return new Date(dateString);
  
  if (/[zZ]$|[+\-]\d{2}:\d{2}$|[+\-]\d{2}\d{2}$/.test(dateString)) {
    return new Date(dateString);
  }
  const isoString = dateString.includes('T')
    ? dateString
    : dateString.replace(' ', 'T');
  return new Date(isoString + 'Z');
}