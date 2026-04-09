const express = require("express");
const request = require("supertest");

const mockAnalyzeMedicineSideEffects = jest.fn();
const mockTriageSymptoms = jest.fn();

jest.mock("../src/middleware/verifyToken", () => (req, res, next) => {
  req.user = { id: "507f1f77bcf86cd799439011", role: "patient" };
  next();
});

jest.mock("../src/config/ai", () => ({
  analyzeMedicineSideEffects: (...args) => mockAnalyzeMedicineSideEffects(...args),
  triageSymptoms: (...args) => mockTriageSymptoms(...args),
}));

const aiRoutes = require("../src/routes/ai");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/ai", aiRoutes);
  return app;
};

describe("AI routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("POST /api/v1/ai/voice-query returns medicine response for medicine mode", async () => {
    mockAnalyzeMedicineSideEffects.mockResolvedValue({
      success: true,
      data: "Medicine guidance",
      mock: false,
    });

    const app = buildApp();
    const res = await request(app)
      .post("/api/v1/ai/voice-query")
      .send({ transcript: "Paracetamol", mode: "medicine" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        medicine: "Paracetamol",
        explanation: "Medicine guidance",
        is_mock: false,
        input_source: "voice",
      })
    );
    expect(mockAnalyzeMedicineSideEffects).toHaveBeenCalledWith("Paracetamol");
  });

  test("POST /api/v1/ai/voice-query returns triage response for triage mode", async () => {
    mockTriageSymptoms.mockResolvedValue({
      success: true,
      data: "Triage guidance",
      mock: true,
    });

    const app = buildApp();
    const res = await request(app)
      .post("/api/v1/ai/voice-query")
      .send({ transcript: "high fever and cough", mode: "triage" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        symptoms: "high fever and cough",
        triage: "Triage guidance",
        is_mock: true,
        input_source: "voice",
      })
    );
    expect(mockTriageSymptoms).toHaveBeenCalledWith("high fever and cough");
  });

  test("POST /api/v1/ai/voice-query validates transcript and mode", async () => {
    const app = buildApp();

    const missingTranscript = await request(app)
      .post("/api/v1/ai/voice-query")
      .send({ mode: "triage" });

    expect(missingTranscript.status).toBe(400);

    const invalidMode = await request(app)
      .post("/api/v1/ai/voice-query")
      .send({ transcript: "headache", mode: "other" });

    expect(invalidMode.status).toBe(400);
  });
});
