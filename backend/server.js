require("dotenv").config();
const express = require("express");
const cors = require("cors");

const {
  checkDeadlineNotifications,
} = require("./src/utils/deadlineNotifications");

const authRoutes = require("./src/routes/authRoutes");
const complaintsRoutes = require("./src/routes/complaintsRoutes");
const usersRoutes = require("./src/routes/usersRoutes");
const reportsRoutes = require("./src/routes/reportsRoutes");
const settingsRoutes = require("./src/routes/settingsRoutes");
const notificationSettingsRoutes = require("./src/routes/notificationSettingsRoutes");
const notificationsRoutes = require("./src/routes/notificationsRoutes");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/notification-settings", notificationSettingsRoutes);
app.use("/api/notifications", notificationsRoutes);

// 404 for unmatched API routes
app.use("/api", (req, res) => res.status(404).json({ error: "Not found." }));

// Centralised error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side." });
});

// check deadlines every 60 seconds  when backend starts
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`CCF API listening on http://localhost:${PORT}`);

  checkDeadlineNotifications();
  setInterval(checkDeadlineNotifications, 60000);
});
