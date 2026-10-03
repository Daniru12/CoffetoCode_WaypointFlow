const bcrypt = require('bcryptjs');
const User = require('../modules/users/user.model');
const Outlet = require('../modules/outlets/outlet.model');

async function seedUsers() {
  console.log('Seeding Users...');
  const defaultPassword = await bcrypt.hash('Waypoint2026!', 10);
  const sampleOutlet = await Outlet.findOne({ outletId: 'OUT001' }) || await Outlet.findOne({});

  const users = [
    {
      name: 'System Admin',
      email: 'admin@waypoint.lk',
      password: defaultPassword,
      role: 'ADMIN',
      depot: 'Peliyagoda'
    },
    {
      name: 'Central Dispatcher',
      email: 'dispatcher@waypoint.lk',
      password: defaultPassword,
      role: 'DISPATCHER',
      depot: 'Peliyagoda'
    },
    {
      name: 'Warehouse Loader',
      email: 'loader@waypoint.lk',
      password: defaultPassword,
      role: 'LOADER',
      depot: 'Peliyagoda'
    },
    {
      name: 'Fleet Driver',
      email: 'driver@waypoint.lk',
      password: defaultPassword,
      role: 'DRIVER',
      depot: 'Peliyagoda'
    },
    {
      name: 'Colombo Store Manager',
      email: 'store.manager@waypoint.lk',
      password: defaultPassword,
      role: 'STORE_MANAGER',
      depot: 'Peliyagoda',
      outlet: sampleOutlet ? sampleOutlet._id : null
    }
  ];

  for (const u of users) {
    await User.findOneAndUpdate({ email: u.email }, u, { upsert: true, new: true });
  }

  console.log(`Seeded ${users.length} default role users.`);
}

module.exports = seedUsers;
