const express = require("express");
const request = require("supertest");

jest.mock("../controllers/notificationController", () => ({
  getMyNotifications: jest.fn((req, res) =>
    res.status(200).json({
      notifications: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    })
  ),
  getUnreadCount: jest.fn((req, res) =>
    res.status(200).json({ unreadCount: 0, unreadByType: {} })
  ),
  markNotificationRead: jest.fn((req, res) =>
    res.status(200).json({ message: "Notification marked as read." })
  ),
  markAllNotificationsRead: jest.fn((req, res) =>
    res.status(200).json({ message: "All notifications marked as read.", matchedCount: 0, modifiedCount: 0 })
  ),
  deleteNotification: jest.fn((req, res) =>
    res.status(200).json({ message: "Notification deleted successfully." })
  ),
}));

jest.mock("../middleware/verifyToken", () => (req, res, next) => {
  req.user = { id: "507f1f77bcf86cd799439011", role: "patient" };
  next();
});

const notificationRoutes = require("../routes/notification");
const {
  getMyNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require("../controllers/notificationController");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/notifications", notificationRoutes);
  return app;
};

describe("Notification routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET / validates query params and rejects invalid type", async () => {
    const app = buildApp();
    const res = await request(app)
      .get("/api/v1/notifications")
      .query({ type: "invalid_type" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed.");
    expect(getMyNotifications).not.toHaveBeenCalled();
  });

  test("GET / validates pagination and rejects page 0", async () => {
    const app = buildApp();
    const res = await request(app)
      .get("/api/v1/notifications")
      .query({ page: 0, limit: 20 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed.");
    expect(getMyNotifications).not.toHaveBeenCalled();
  });

  test("GET / accepts valid filters and calls controller", async () => {
    const app = buildApp();
    const res = await request(app)
      .get("/api/v1/notifications")
      .query({
        unreadOnly: true,
        type: "system",
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-01-31T23:59:59.999Z",
        page: 1,
        limit: 10,
      });

    expect(res.status).toBe(200);
    expect(getMyNotifications).toHaveBeenCalledTimes(1);
  });

  test("GET /unread-count calls controller", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/v1/notifications/unread-count");

    expect(res.status).toBe(200);
    expect(getUnreadCount).toHaveBeenCalledTimes(1);
  });

  test("PATCH /read-all calls controller", async () => {
    const app = buildApp();
    const res = await request(app).patch("/api/v1/notifications/read-all");

    expect(res.status).toBe(200);
    expect(markAllNotificationsRead).toHaveBeenCalledTimes(1);
  });

  test("PATCH /:id/read validates notification id", async () => {
    const app = buildApp();
    const res = await request(app).patch("/api/v1/notifications/not-an-id/read");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed.");
    expect(markNotificationRead).not.toHaveBeenCalled();
  });

  test("PATCH /:id/read accepts valid id and calls controller", async () => {
    const app = buildApp();
    const res = await request(app).patch(
      "/api/v1/notifications/507f1f77bcf86cd799439012/read"
    );

    expect(res.status).toBe(200);
    expect(markNotificationRead).toHaveBeenCalledTimes(1);
  });

  test("DELETE /:id validates notification id", async () => {
    const app = buildApp();
    const res = await request(app).delete("/api/v1/notifications/not-an-id");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Validation failed.");
    expect(deleteNotification).not.toHaveBeenCalled();
  });

  test("DELETE /:id accepts valid id and calls controller", async () => {
    const app = buildApp();
    const res = await request(app).delete("/api/v1/notifications/507f1f77bcf86cd799439012");

    expect(res.status).toBe(200);
    expect(deleteNotification).toHaveBeenCalledTimes(1);
  });
});
