import { Trip } from "@trip-master/shared";

export function sortAndReindex(days: Trip["days"]): Trip["days"] {
  return [...days]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((day, idx) => ({
      ...day,
      dayIndex: idx,
      items: (day.items ?? []).map((item) => ({ ...item }))
    }));
}
