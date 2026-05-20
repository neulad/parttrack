exports.up = (pgm) => {
  pgm.createTable('shipments', {
    id: { type: 'serial', primaryKey: true },
    part_id: { type: 'integer', notNull: true, references: '"parts"', onDelete: 'CASCADE' },
    quantity: { type: 'integer', notNull: true, check: 'quantity > 0' },
    tracking_link: { type: 'text' },
    status: { type: 'text', notNull: true, default: "'pending'", check: "status IN ('pending','delivered')" },
    created_by: { type: 'integer', references: '"users"', onDelete: 'SET NULL' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    delivered_at: { type: 'timestamptz' },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('shipments');
};
