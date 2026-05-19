exports.up = (pgm) => {
  pgm.createTable('stations', {
    id: { type: 'serial', primaryKey: true },
    name: { type: 'text', notNull: true },
    location: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('users', {
    id: { type: 'serial', primaryKey: true },
    email: { type: 'text', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    role: { type: 'text', notNull: true, check: "role IN ('admin','delegate')" },
    station_id: {
      type: 'integer',
      references: '"stations"',
      onDelete: 'SET NULL',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('parts', {
    id: { type: 'serial', primaryKey: true },
    station_id: {
      type: 'integer',
      notNull: true,
      references: '"stations"',
      onDelete: 'CASCADE',
    },
    name: { type: 'text', notNull: true },
    sku: { type: 'text', notNull: true },
    supplier: { type: 'text' },
    min_threshold: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('parts', 'parts_station_sku_unique', 'UNIQUE(station_id, sku)');

  pgm.createTable('stock_levels', {
    id: { type: 'serial', primaryKey: true },
    part_id: {
      type: 'integer',
      notNull: true,
      unique: true,
      references: '"parts"',
      onDelete: 'CASCADE',
    },
    quantity: { type: 'integer', notNull: true, default: 0 },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('audit_log', {
    id: { type: 'serial', primaryKey: true },
    user_id: { type: 'integer', references: '"users"', onDelete: 'SET NULL' },
    part_id: { type: 'integer', references: '"parts"', onDelete: 'SET NULL' },
    old_quantity: { type: 'integer' },
    new_quantity: { type: 'integer' },
    delta: { type: 'integer' },
    note: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('email_cooldowns', {
    part_id: {
      type: 'integer',
      primaryKey: true,
      references: '"parts"',
      onDelete: 'CASCADE',
    },
    last_sent_at: { type: 'timestamptz', notNull: true },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('email_cooldowns');
  pgm.dropTable('audit_log');
  pgm.dropTable('stock_levels');
  pgm.dropTable('parts');
  pgm.dropTable('users');
  pgm.dropTable('stations');
};
