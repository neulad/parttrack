require('dotenv').config();
const express = require('express');

const authRoutes = require('./routes/auth');
const stationsRoutes = require('./routes/stations');
const partsRoutes = require('./routes/parts');
const adminRoutes = require('./routes/admin');
const { startStockCheckJob } = require('./jobs/stockCheck');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/stations', stationsRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on :${PORT}`);
  startStockCheckJob();
});
