const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    // Skip if already seeded
    const { rows } = await client.query('SELECT id FROM stations LIMIT 1');
    if (rows.length > 0) {
      console.log('Database already seeded, skipping.');
      return;
    }

    await client.query('BEGIN');

    // Stations
    const s1 = await client.query(
      "INSERT INTO stations(name, location) VALUES('Alpha Station','Germany, Hamburg, Allee 28') RETURNING id"
    );
    const s2 = await client.query(
      "INSERT INTO stations(name, location) VALUES('Beta Station','Netherlands, Rotterdam, Waalhaven 12') RETURNING id"
    );
    const s3 = await client.query(
      "INSERT INTO stations(name, location) VALUES('Gamma Station','Poland, Warsaw, Pruszkowska 17') RETURNING id"
    );
    const [alphaId, betaId, gammaId] = [s1.rows[0].id, s2.rows[0].id, s3.rows[0].id];

    // Users
    const hash = await bcrypt.hash('admin123', 10);
    const delegateHash = await bcrypt.hash('delegate123', 10);

    await client.query(
      "INSERT INTO users(email, password_hash, role) VALUES('admin@parttrack.dev',$1,'admin')",
      [hash]
    );
    await client.query(
      "INSERT INTO users(email, password_hash, role, station_id) VALUES('alpha@parttrack.dev',$1,'delegate',$2)",
      [delegateHash, alphaId]
    );
    await client.query(
      "INSERT INTO users(email, password_hash, role, station_id) VALUES('beta@parttrack.dev',$1,'delegate',$2)",
      [delegateHash, betaId]
    );

    // Parts + stock levels
    const parts = [
      { station_id: alphaId, name: 'Servo Motor 12V', sku: 'SRV-001', supplier: 'RoboSupply Co', min_threshold: 5, qty: 12 },
      { station_id: alphaId, name: 'Bearing 6202', sku: 'BRG-202', supplier: 'FastBear Ltd', min_threshold: 20, qty: 3 },
      { station_id: alphaId, name: 'Timing Belt GT2', sku: 'BLT-GT2', supplier: 'DriveWorks', min_threshold: 10, qty: 8 },
      { station_id: betaId, name: 'Stepper NEMA17', sku: 'STP-N17', supplier: 'MotorHub', min_threshold: 4, qty: 2 },
      { station_id: betaId, name: 'Arduino Mega', sku: 'ARD-MEG', supplier: 'MicroElec', min_threshold: 3, qty: 7 },
      { station_id: betaId, name: 'Limit Switch NO', sku: 'LMT-NO1', supplier: 'SwitchPro', min_threshold: 15, qty: 1 },
      { station_id: gammaId, name: 'Pneumatic Cylinder', sku: 'PNM-CYL', supplier: 'AirTech', min_threshold: 2, qty: 5 },
      { station_id: gammaId, name: 'Proximity Sensor', sku: 'PRX-001', supplier: 'SenseTech', min_threshold: 6, qty: 0 },
      { station_id: gammaId, name: 'Cable Chain 15x20', sku: 'CBL-C15', supplier: 'CableWorks', min_threshold: 3, qty: 4 },
      { station_id: gammaId, name: 'M5 Hex Bolt 20mm', sku: 'M5B-020', supplier: 'BoltDepot', min_threshold: 50, qty: 30 },
    ];

    for (const p of parts) {
      const { rows: [part] } = await client.query(
        `INSERT INTO parts(station_id, name, sku, supplier, min_threshold)
         VALUES($1,$2,$3,$4,$5) RETURNING id`,
        [p.station_id, p.name, p.sku, p.supplier, p.min_threshold]
      );
      await client.query(
        'INSERT INTO stock_levels(part_id, quantity) VALUES($1,$2)',
        [part.id, p.qty]
      );
    }

    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
