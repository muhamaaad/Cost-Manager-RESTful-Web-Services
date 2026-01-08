const request = require('supertest');

/*
 * Unit tests for Logs (Admin) Service.
 * Endpoint: GET /api/logs
 */

/* -------------------- Ensure env for service import -------------------- */
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mock://uri';

/* -------------------- Global Mocks -------------------- */
const mockLogCreate = jest.fn().mockResolvedValue(undefined);
const mockLogFind = jest.fn();

// Prevent real MongoDB connection
jest.mock('mongoose', () => ({
  connect: jest.fn(() => Promise.resolve())
}));

// Mock Log model: Log.find(...).sort(...)
jest.mock('../models/Log', () => ({
  create: (...args) => mockLogCreate(...args),
  find: (...args) => mockLogFind(...args)
}));

/* -------------------- App -------------------- */
const app = require('./logs_service');

describe('Logs Service - GET /api/logs', () => {
  beforeEach(() => {
    mockLogCreate.mockClear();
    mockLogFind.mockClear();
  });

  test('success: should return 200 with logs array', async () => {
    // Log.find returns a query object with .sort()
    mockLogFind.mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { method: 'GET', url: '/api/logs', status: 200, timestamp: '2026-01-01T00:00:00Z' }
      ])
    });

    const res = await request(app).get('/api/logs');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);

    // Ensure middleware wrote a log entry
    expect(mockLogCreate).toHaveBeenCalled();
    expect(mockLogFind).toHaveBeenCalledTimes(1);
  });

  test('failure: db error should return 500 with error json', async () => {
    mockLogFind.mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error('DB error'))
    });

    const res = await request(app).get('/api/logs');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ id: 500, message: 'DB error' });
  });
});
