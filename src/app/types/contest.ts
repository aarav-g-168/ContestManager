export interface Contest {
  id: number;
  event: string;
  host: string;
  href: string;
  start: string;
  duration: number;
  formattedStartIST?: string;
}