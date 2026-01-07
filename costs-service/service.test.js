const request = require('supertest');

/*
 * Unit tests for Costs Service.
 * Pure unit tests with full mocking (no real DB).
 */

/* -------------------- Global Mocks -------------------- */
const mockLogCreate = jest.fn().mockResolvedValue(undefined);
const mockUserFindOne = jest.fn();
const mockCostSave = jest.fn().mockResolvedValue(undefined);
const mockCostFind = jest.fn();
const mockReportFindOne = jest.fn();
const mockReportSave = jest.fn().mockResolvedValue(undefined);

// Prevent real MongoDB connection
jest.mock('mongoose', () => ({
  connect: jest.fn(() => Promise.resolve())
}));

// Mock Cost model
jest.mock('../models/Cost', () => {
  const CostModel = jest.fn(function CostMock(data) {
    Object.assign(this, data);
    this.save = mockCostSave;
  });
  CostModel.find = (...args) => mockCostFind(...args);
  return CostModel;
});

// Mock Report model
jest.mock('../models/Report', () => {
  const ReportModel = jest.fn(function ReportMock(data) {
    Object.assign(this, data);
    this.save = mockReportSave;
  });
  ReportModel.findOne = (...args) => mockReportFindOne(...args);
  return ReportModel;
});

// Mock Log model (used by middleware)
jest.mock('../models/Log', () => ({
  create: (...args) => mockLogCreate(...args)
}));

// Mock User model
jest.mock('../models/User', () => ({
  findOne: (...args) => mockUserFindOne(...args)
}));

/* -------------------- App -------------------- */
const app = require('./service');

/* ======================================================
   POST /api/add
   ====================================================== */
describe('Costs Service - POST /api/add', () => {
  beforeEach(() => {
    mockLogCreate.mockClear();
    mockUserFindOne.mockClear();
    mockCostSave.mockClear();
  });

  test('success: should add cost and return 201 with cost json', async () => {
    mockUserFindOne.mockResolvedValue({ id: 123123 });

    const future = new Date(Date.now() + 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/add')
      .send({
        description: 'choco',
        category: 'food',
        userid: 123123,
        sum: 12,
        date: future
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userid', 123123);
    expect(res.body).toHaveProperty('description', 'choco');
    expect(res.body).toHaveProperty('category', 'food');
    expect(res.body).toHaveProperty('sum', 12);

    expect(typeof res.body.year).toBe('number');
    expect(typeof res.body.month).toBe('number');
    expect(typeof res.body.day).toBe('number');

    expect(mockCostSave).toHaveBeenCalledTimes(1);
    expect(mockLogCreate).toHaveBeenCalled();
  });

  test('failure: missing required fields should return 400', async () => {
    mockUserFindOne.mockResolvedValue({ id: 123123 });

    const res = await request(app)
      .post('/api/add')
      .send({ category: 'food', userid: 123123, sum: 10 });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ id: 400, message: 'Missing required fields' });
    expect(mockCostSave).toHaveBeenCalledTimes(0);
  });

  test('failure: non-existing user should return 400', async () => {
    mockUserFindOne.mockResolvedValue(null);

    const future = new Date(Date.now() + 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/add')
      .send({
        description: 'no-user',
        category: 'food',
        userid: 999999,
        sum: 10,
        date: future
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ id: 400, message: 'User does not exist' });
    expect(mockCostSave).toHaveBeenCalledTimes(0);
  });

  test('failure: cost date in the past should return 400', async () => {
    mockUserFindOne.mockResolvedValue({ id: 123123 });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0); 
    const past = yesterday.toISOString();


    const res = await request(app)
      .post('/api/add')
      .send({
        description: 'old-cost',
        category: 'food',
        userid: 123123,
        sum: 10,
        date: past
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ id: 400, message: 'Cost date cannot be in the past' });
    expect(mockCostSave).toHaveBeenCalledTimes(0);
  });

  test('failure: db error during user lookup should return 400', async () => {
    mockUserFindOne.mockRejectedValue(new Error('DB down'));

    const future = new Date(Date.now() + 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/add')
      .send({
        description: 'err',
        category: 'food',
        userid: 123123,
        sum: 10,
        date: future
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ id: 400, message: 'DB down' });
    expect(mockCostSave).toHaveBeenCalledTimes(0);
  });
});

/* ======================================================
   GET /api/report
   ====================================================== */
describe('Costs Service - GET /api/report', () => {
  beforeEach(() => {
    mockCostFind.mockClear();
    mockReportFindOne.mockClear();
    mockReportSave.mockClear();
  });

  test('failure: missing id/year/month should return 400', async () => {
    const res = await request(app).get('/api/report?id=123123&year=2026');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ id: 400, message: 'Missing or invalid id/year/month' });
  });

  test('success: past month with cached report should return cached report', async () => {
    const cached = {
      userid: 123123,
      year: 2020,
      month: 1,
      costs: [{ food: [] }]
    };

    mockReportFindOne.mockResolvedValue(cached);

    const res = await request(app)
      .get('/api/report?id=123123&year=2020&month=1');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(cached);

    expect(mockReportFindOne).toHaveBeenCalledTimes(1);
    expect(mockCostFind).toHaveBeenCalledTimes(0);
    expect(mockReportSave).toHaveBeenCalledTimes(0);
  });

  test('success: past month without cache should compute, save, and return report', async () => {
    mockReportFindOne.mockResolvedValue(null);

    mockCostFind.mockResolvedValue([
      { category: 'food', sum: 12, description: 'choco', day: 17 },
      { category: 'education', sum: 82, description: 'math book', day: 10 }
    ]);

    const res = await request(app)
      .get('/api/report?id=123123&year=2020&month=1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userid', 123123);
    expect(res.body).toHaveProperty('year', 2020);
    expect(res.body).toHaveProperty('month', 1);
    expect(Array.isArray(res.body.costs)).toBe(true);

    expect(mockCostFind).toHaveBeenCalledTimes(1);
    expect(mockReportSave).toHaveBeenCalledTimes(1);
  });

  test('success: future month should compute but not save', async () => {
    mockCostFind.mockResolvedValue([
      { category: 'food', sum: 10, description: 'apple', day: 1 }
    ]);

    const res = await request(app)
      .get('/api/report?id=123123&year=2099&month=1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('userid', 123123);
    expect(res.body).toHaveProperty('year', 2099);
    expect(res.body).toHaveProperty('month', 1);

    expect(mockCostFind).toHaveBeenCalledTimes(1);
    expect(mockReportSave).toHaveBeenCalledTimes(0);
  });

  test('failure: db error should return 500', async () => {
    mockCostFind.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .get('/api/report?id=123123&year=2099&month=1');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ id: 500, message: 'DB error' });
  });
});
