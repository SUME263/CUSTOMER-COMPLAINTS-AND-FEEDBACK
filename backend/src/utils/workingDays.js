function addWorkingDays(date, workingDays) {
  const result = new Date(date);
  const direction = workingDays >= 0 ? 1 : -1;
  let daysRemaining = Math.abs(workingDays);

  while (daysRemaining > 0) {
    result.setDate(result.getDate() + direction);

    const day = result.getDay();

    // Monday = 1, Friday = 5
    if (day !== 0 && day !== 6) {
      daysRemaining--;
    }
  }

  return result;
}

module.exports = {
  addWorkingDays,
};