const request = require('supertest');

/*
 * Unit tests for Users Service.
 * Pure unit tests with full mocking (no real DB).
 */

/* -------------------- Ensure env for service import -------------------- */
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mock://uri';

/* -------------------- Global Mocks -------------------- */
const mockLogCreate = jest.fn().mockResolvedValue(undefined);

const mockUserSave = jest.fn().mockResolvedValue(undefined);
const mockUserFind = jest.fn();
const mockUserFindOne = jest.fn();

const mockCostAggregate = jest.fn();

// Prevent real MongoDB connection
jest.mock('mongoose', () => ({
  connect: jest.fn(() => Promise.resolve())
}));

// Mock User model: new User(...).save() + User.find + User.findOne
jest.mock('../models/User', () => {
  const UserModel = jest.fn(function UserMock(data) {
    Object.assign(this, data);
    this.save = mockUserSave;
  });

  UserModel.find = (...args) => mockUserFind(...args);
  UserModel.findOne = (...args) => mockUserFindOne(...args);

  return UserModel;
});

// Mock Cost model: Cost.aggregate
jest.mock('../models/Cost', () => ({
  aggregate: (...args) => mockCostAggregate(...args)
}));

// Mock Log model used by middleware
jest.mock('../models/Log', () => ({
  create: (...args) => mockLogCreate(...args)
}));

/* -------------------- App -------------------- */
const app = require('./service');

/* ======================================================
   POST /api/add
   ====================================================== */
describe('Users Service - POST /api/add', () => {
  beforeEach(() => {
    mockLogCreate.mockClear();
    mockUserSave.mockClear();
  });

  test('success: should add user and return 201 with user json', async () => {
    // Arrange
    mockUserSave.mockResolvedValue(undefined);

    const payload = {
      id: 123123,
      first_name: 'mosh',
      last_name: 'ישראלי',
      birthday: '1990-01-01'
    };

    // Act
    const res = await request(app).post('/api/add').send(payload);

    // Assert
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 123123);
    expect(res.body).toHaveProperty('first_name', 'mosh');
    expect(res.body).toHaveProperty('last_name', 'ישראלי');
    expect(res.body).toHaveProperty('birthday');

    expect(mockUserSave).toHaveBeenCalledTimes(1);
    expect(mockLogCreate).toHaveBeenCalled();
  });

  test('failure: db/validation error should return 400 with error message', async () => {
    mockUserSave.mockRejectedValue(new Error('Duplicate key'));

    const res = await request(app).post('/api/add').send({
      id: 123123,
      first_name: 'mosh',
      last_name: 'israeli',
      birthday: '1990-01-01'
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ id: 400, message: 'Duplicate key' });
  });
});

/* ======================================================
   GET /api/users
   ====================================================== */
describe('Users Service - GET /api/users', () => {
  beforeEach(() => {
    mockLogCreate.mockClear();
    mockUserFind.mockClear();
  });

  test('success: should return 200 with array of users', async () => {
    mockUserFind.mockResolvedValue([
      { id: 1, first_name: 'a', last_name: 'b', birthday: '2000-01-01' },
      { id: 2, first_name: 'c', last_name: 'd', birthday: '2001-01-01' }
    ]);

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);

    expect(mockUserFind).toHaveBeenCalledTimes(1);
    expect(mockLogCreate).toHaveBeenCalled();
  });

  test('failure: db error should return 500', async () => {
    mockUserFind.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ id: 500, message: 'DB error' });
  });
});

/* ======================================================
   GET /api/users/:id
   ====================================================== */
describe('Users Service - GET /api/users/:id', () => {
  beforeEach(() => {
    mockLogCreate.mockClear();
    mockUserFindOne.mockClear();
    mockCostAggregate.mockClear();
  });

  test('failure: invalid user id should return 400', async () => {
    const res = await request(app).get('/api/users/abc');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ id: 400, message: 'Invalid user id' });
  });

  test('failure: user not found should return 404', async () => {
    mockUserFindOne.mockResolvedValue(null);

    const res = await request(app).get('/api/users/123123');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ id: 404, message: 'User not found' });
  });

  test('success: user found and no costs => total 0', async () => {
    mockUserFindOne.mockResolvedValue({
      id: 123123,
      first_name: 'mosh',
      last_name: 'israeli'
    });

    mockCostAggregate.mockResolvedValue([]); // no costs

    const res = await request(app).get('/api/users/123123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      first_name: 'mosh',
      last_name: 'israeli',
      id: 123123,
      total: 0
    });

    expect(mockCostAggregate).toHaveBeenCalledTimes(1);
  });

  test('success: user found and costs exist => total returned', async () => {
    mockUserFindOne.mockResolvedValue({
      id: 123123,
      first_name: 'mosh',
      last_name: 'israeli'
    });

    mockCostAggregate.mockResolvedValue([{ total: 55 }]);

    const res = await request(app).get('/api/users/123123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      first_name: 'mosh',
      last_name: 'israeli',
      id: 123123,
      total: 55
    });
  });

  test('failure: db error should return 500', async () => {
    mockUserFindOne.mockRejectedValue(new Error('DB down'));

    const res = await request(app).get('/api/users/123123');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ id: 500, message: 'DB down' });
  });
});
