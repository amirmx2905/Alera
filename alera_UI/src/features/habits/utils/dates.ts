export const toLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseEntryDate = (value: string) => {
  if (value.length === 10) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
};
