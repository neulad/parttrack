const { shouldAlert } = require('../jobs/stockCheck');

const base = {
  quantity: 2,
  min_threshold: 5,
  in_transit: 0,
  last_sent_at: null,
  alert_count: 0,
};

const now = new Date('2026-05-20T10:00:00Z');

describe('shouldAlert', () => {
  it('alerts when never alerted before and stock is low', () => {
    expect(shouldAlert(base, now)).toBe(true);
  });

  it('suppresses when qty + in_transit >= threshold', () => {
    expect(shouldAlert({ ...base, quantity: 2, in_transit: 3 }, now)).toBe(false);
    expect(shouldAlert({ ...base, quantity: 5, in_transit: 0 }, now)).toBe(false);
  });

  it('suppresses when last alert was < 24h ago (count < 3)', () => {
    const lastSent = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    expect(shouldAlert({ ...base, last_sent_at: lastSent, alert_count: 1 }, now)).toBe(false);
  });

  it('alerts when last alert was >= 24h ago (count < 3)', () => {
    const lastSent = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    expect(shouldAlert({ ...base, last_sent_at: lastSent, alert_count: 2 }, now)).toBe(true);
  });

  it('suppresses when count >= 3 and it is not Monday 8am', () => {
    const lastSent = new Date(now.getTime() - 200 * 60 * 60 * 1000).toISOString();
    // now = Tuesday 10am UTC
    expect(shouldAlert({ ...base, last_sent_at: lastSent, alert_count: 3 }, now)).toBe(false);
  });

  it('alerts when count >= 3, it is Monday 8am, and >= 144h since last alert', () => {
    const monday8am = new Date('2026-05-18T08:00:00Z'); // Monday
    const lastSent = new Date(monday8am.getTime() - 145 * 60 * 60 * 1000).toISOString();
    expect(shouldAlert({ ...base, last_sent_at: lastSent, alert_count: 5 }, monday8am)).toBe(true);
  });

  it('suppresses when count >= 3, Monday 8am, but < 144h since last alert', () => {
    const monday8am = new Date('2026-05-18T08:00:00Z');
    const lastSent = new Date(monday8am.getTime() - 100 * 60 * 60 * 1000).toISOString();
    expect(shouldAlert({ ...base, last_sent_at: lastSent, alert_count: 3 }, monday8am)).toBe(false);
  });
});
