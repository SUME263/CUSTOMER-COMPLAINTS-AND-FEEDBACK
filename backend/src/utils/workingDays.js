function addWorkingDays(date, workingDays) {
  // create a copy of the given date
  const result = new Date(date);

  // determine whether to move forward or backward through the dates
  const direction = workingDays >= 0 ? 1 : -1;
  let daysRemaining = Math.abs(workingDays);

  // continue until all working days have been counted
  while (daysRemaining > 0) {
    result.setDate(result.getDate() + direction);

    const day = result.getDay();

    // skip saturday and sunday when counting working days
    if (day !== 0 && day !== 6) {
      daysRemaining--;
    }
  }

  // return the date after adding or subtracting the working days
  return result;
}

module.exports = {
  addWorkingDays,
};