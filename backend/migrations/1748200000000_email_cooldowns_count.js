exports.up = (pgm) => {
  pgm.addColumns('email_cooldowns', {
    alert_count: { type: 'integer', notNull: true, default: 0 },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('email_cooldowns', ['alert_count']);
};
