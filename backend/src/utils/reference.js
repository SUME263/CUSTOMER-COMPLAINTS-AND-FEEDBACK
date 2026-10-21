const db = require("../config/db");

// Creates a new reference number like CCF-2026-1001
function generateReference() {
  //get current year
  const year = new Date().getFullYear();
  const prefix = `CCF-${year}-`;

  // Find the last complaint reference made this yea
  const row = db
    .prepare(
      `SELECT reference FROM complaints
       WHERE reference LIKE ?
       ORDER BY id DESC LIMIT 1`,
    )
    .get(`${prefix}%`);

  let nextNum = 1001;
  if (row) {
    const lastNum = parseInt(row.reference.split("-")[2], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${nextNum}`;
}

module.exports = { generateReference };
