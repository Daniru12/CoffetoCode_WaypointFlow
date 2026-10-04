require('dotenv').config();
const mongoose = require('mongoose');
const InventoryItem = require('./src/modules/inventory/inventoryItem.model');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to DB');
    const res = await InventoryItem.deleteMany({ itemCode: { $in: ['ITEM01', 'ITEM02'] } });
    console.log('Deleted dummy items:', res.deletedCount);
    process.exit(0);
  })
  .catch(err => {
    console.error('DB Error', err);
    process.exit(1);
  });
