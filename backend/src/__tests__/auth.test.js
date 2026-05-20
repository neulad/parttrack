process.env.JWT_SECRET = 'test-secret-for-jest';

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');

// Mock pool before requiring routes
jest.mock('../db', () => ({
  query: jest.fn(),
}));

const pool = require('../db');
const authRoutes = require('../routes/auth');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('POST /api/auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'secret' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'pw' });
    expect(res.status).toBe(400);
  });

  it('returns 401 for unknown user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('correct', 10);
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@b.com', password_hash: hash, role: 'admin', station_id: null }] });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with token for valid credentials', async () => {
    const hash = await bcrypt.hash('correct', 10);
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'a@b.com', password_hash: hash, role: 'admin', station_id: null }] });
    const res = await request(app).post('/api/auth/login').send({ email: 'a@b.com', password: 'correct' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('a@b.com');
  });
});
