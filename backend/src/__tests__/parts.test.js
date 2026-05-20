process.env.JWT_SECRET = 'test-secret-for-jest';

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

const pool = require('../db');
const partsRoutes = require('../routes/parts');

const app = express();
app.use(express.json());
app.use('/api/parts', partsRoutes);

function makeToken(role = 'admin', station_id = null) {
  return jwt.sign({ id: 1, email: 'test@test.com', role, station_id }, process.env.JWT_SECRET);
}

describe('GET /api/parts', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/parts');
    expect(res.status).toBe(401);
  });

  it('returns paginated parts for admin', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Part A' }, { id: 2, name: 'Part B' }] });

    const res = await request(app)
      .get('/api/parts')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rows');
    expect(res.body).toHaveProperty('total', 2);
    expect(res.body).toHaveProperty('page', 1);
  });

  it('returns 400 for invalid page param', async () => {
    const res = await request(app)
      .get('/api/parts?page=abc')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/parts/:id/quantity', () => {
  it('returns 400 for negative quantity', async () => {
    const res = await request(app)
      .patch('/api/parts/1/quantity')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ quantity: -5 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-numeric quantity', async () => {
    const res = await request(app)
      .patch('/api/parts/1/quantity')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ quantity: 'abc' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when part not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .patch('/api/parts/999/quantity')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ quantity: 10 });
    expect(res.status).toBe(404);
  });

  it('returns 403 for delegate accessing another station', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ station_id: 2 }] });
    const res = await request(app)
      .patch('/api/parts/1/quantity')
      .set('Authorization', `Bearer ${makeToken('delegate', 1)}`)
      .send({ quantity: 10 });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/parts/:id/shipments', () => {
  it('returns 400 for quantity less than 1', async () => {
    const res = await request(app)
      .post('/api/parts/1/shipments')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid tracking_link', async () => {
    const res = await request(app)
      .post('/api/parts/1/shipments')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ quantity: 5, tracking_link: 'not-a-url' });
    expect(res.status).toBe(400);
  });
});
