const request = require('supertest');

/*
 * Unit tests for Developers (Admin) Service.
 * Endpoint: GET /api/about
 */

/* -------------------- Ensure env for service import -------------------- */
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mock://uri';

/* -------------------- Global Mocks -------------------- */
const mockLogCreate = jest.fn().mockResolvedValue(undefined);

// Prevent real MongoDB connection
jest.mock('mongoose', () => ({
  connect: jest.fn(() => Promise.resolve())
}));

// Mock Log model used by middleware
jest.mock('../models/Log', () => ({
  create: (...args) => mockLogCreate(...args)
}));

/* -------------------- App -------------------- */
const app = require('./developer_service');

describe('Developers Service - GET /api/about', () => {
  beforeEach(() => {
    mockLogCreate.mockClear();
  });

  test('success: should return 200 with developers array (first_name + last_name only)', async () => {
    const res = await request(app).get('/api/about');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Validate shape strictly: only first_name and last_name
    res.body.forEach((dev) => {
      expect(dev).toHaveProperty('first_name');
      expect(dev).toHaveProperty('last_name');
      expect(Object.keys(dev).sort()).toEqual(['first_name', 'last_name']);
    });

    // Middleware log should be written
    expect(mockLogCreate).toHaveBeenCalled();
  });
});
