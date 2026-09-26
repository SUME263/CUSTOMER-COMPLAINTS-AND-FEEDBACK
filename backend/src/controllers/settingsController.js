const db = require("../config/db");

const DEFAULT_SETTINGS = {
  acknowledge_days: 2,
  resolve_days: 14,
};

function getSetting(key) {
  const row = db
    .prepare("SELECT setting_value FROM system_settings WHERE setting_key = ?")
    .get(key);

  if (row) {
    return Number(row.setting_value);
  }

  return DEFAULT_SETTINGS[key];
}

/**
 * GET /api/settings — admin only.
 */
function getSettings(req, res) {
  res.json({
    acknowledgeDays: getSetting("acknowledge_days"),
    resolveDays: getSetting("resolve_days"),
  });
}

/**
 * PATCH /api/settings — admin only.
 */
function updateSettings(req, res) {
  const { acknowledgeDays, resolveDays } = req.body;

  if (
    acknowledgeDays !== undefined &&
    (!Number.isInteger(acknowledgeDays) || acknowledgeDays < 1)
  ) {
    return res.status(400).json({
      error: "Acknowledgement days must be a whole number greater than 0.",
    });
  }

  if (
    resolveDays !== undefined &&
    (!Number.isInteger(resolveDays) || resolveDays < 1)
  ) {
    return res.status(400).json({
      error: "Resolution days must be a whole number greater than 0.",
    });
  }

  if (acknowledgeDays === undefined && resolveDays === undefined) {
    return res.status(400).json({
      error: "At least one setting must be provided.",
    });
  }

  const upsert = db.prepare(`
    INSERT INTO system_settings (setting_key, setting_value, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(setting_key)
    DO UPDATE SET
      setting_value = excluded.setting_value,
      updated_at = datetime('now')
  `);

  const update = db.transaction(() => {
    if (acknowledgeDays !== undefined) {
      upsert.run("acknowledge_days", String(acknowledgeDays));
    }

    if (resolveDays !== undefined) {
      upsert.run("resolve_days", String(resolveDays));
    }
  });

  update();

  res.json({
    message: "Settings updated successfully.",
    acknowledgeDays: getSetting("acknowledge_days"),
    resolveDays: getSetting("resolve_days"),
  });
}

module.exports = {
  getSettings,
  updateSettings,
};
