export const toLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toDateKeyForTimezone = (value: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return toLocalDateKey(value);
  }

  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string) => new Date(`${value}T00:00:00`);

export const getMondayStartKey = (dateKey: string) => {
  const date = parseDateKey(dateKey);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return toLocalDateKey(date);
};

export const getMonthStartKey = (dateKey: string) => {
  const date = parseDateKey(dateKey);
  return toLocalDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
};

export const getSundayDateKey = (dateKey: string) => {
  const date = parseDateKey(dateKey);
  const dayOfWeek = date.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  date.setDate(date.getDate() + daysUntilSunday);
  return toLocalDateKey(date);
};

export const getMonthEndKey = (dateKey: string) => {
  const date = parseDateKey(dateKey);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return toLocalDateKey(lastDay);
};

export const getCdmxDateKey = () => {
  return toDateKeyForTimezone(new Date(), "America/Mexico_City");
};

export const parseEntryDate = (value: string) => {
  if (value.length === 10) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
};
