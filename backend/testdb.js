require('dotenv').config();
const mongoose = require('mongoose');
const InventoryItem = require('./src/modules/inventory/inventoryItem.model');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const items = await InventoryItem.find();
    console.log('Items found:', items.length);
    console.log(items);
    process.exit(0);
  })
  .catch(err => {
    console.error('DB Error', err);
    process.exit(1);
  });
