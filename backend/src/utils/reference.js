const db = require("../config/db");

// generate a new complaint reference number using the current year
function generateReference() {
  // get the current year
  const year = new Date().getFullYear();
  const prefix = `CCF-${year}-`;

  // find the most recently created complaint reference for this year
  const row = db
    .prepare(
      `SELECT reference FROM complaints
       WHERE reference LIKE ?
       ORDER BY id DESC LIMIT 1`,
    )
    .get(`${prefix}%`);

  // start numbering from 1001 if no reference exists for this year
  let nextNum = 1001;
  if (row) {
    // extract the number from the last reference and increment it
    const lastNum = parseInt(row.reference.split("-")[2], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  // return the complete reference number
  return `${prefix}${nextNum}`;
}

module.exports = { generateReference };