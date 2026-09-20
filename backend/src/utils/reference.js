const db = require('../config/db');

/**
 * Generates the next sequential reference in the form CCF-<year>-<number>,
 * matching the format already used across the frontend prototype.
 */
function generateReference() {
  const year = new Date().getFullYear();
  const prefix = `CCF-${year}-`;

  const row = db
    .prepare(
      `SELECT reference FROM complaints
       WHERE reference LIKE ?
       ORDER BY id DESC LIMIT 1`
    )
    .get(`${prefix}%`);

  let nextNum = 1001;
  if (row) {
    const lastNum = parseInt(row.reference.split('-')[2], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${nextNum}`;
}

module.exports = { generateReference };
