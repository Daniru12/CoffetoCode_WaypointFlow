const InventoryItem = require('./inventoryItem.model');
const StoreManagerInventory = require('./storeManagerInventory.model');
const StockRequest = require('./stockRequest.model');
const Issue = require('../issues/issue.model');
const fs = require('fs');

exports.getAllItems = async (req, res, next) => {
  try {
    const items = await InventoryItem.find().sort({ itemCode: 1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

exports.uploadCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Read as buffer first to strip BOM and handle encoding
    const rawBuffer = fs.readFileSync(req.file.path);
    // Strip UTF-8 BOM if present (EF BB BF)
    let fileContent = rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF
      ? rawBuffer.slice(3).toString('utf8')
      : rawBuffer.toString('utf8');

    // Also strip UTF-16 BOM if present
    fileContent = fileContent.replace(/^\uFEFF/, '');

    console.log('File size:', rawBuffer.length, 'bytes');
    console.log('First 200 chars:', JSON.stringify(fileContent.substring(0, 200)));

    // Split lines - handle all possible line endings
    const lines = fileContent.split(/\r\n|\r|\n/).filter(l => l.trim() !== '');
    console.log('Total lines:', lines.length);

    if (lines.length < 2) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'CSV is empty or has no data rows' });
    }

    // Detect separator
    const firstLine = lines[0];
    let sep = ',';
    if ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length) sep = '\t';
    else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) sep = ';';

    console.log('Separator detected:', JSON.stringify(sep));
    
    // Parse headers
    const headers = firstLine.split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    console.log('Headers:', headers);

    let updatedCount = 0;
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, '')); // strip quotes
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

      console.log(`Row ${i}:`, row);

      // Flexible code detection
      const codeHeader = headers.find(h => h.includes('code') || h.includes('sku') || h.includes('id') || h === 'item');
      const code = (codeHeader ? row[codeHeader] : values[0]);

      if (!code || !code.trim()) continue;

      const itemCode = String(code).trim();
      
      const nameHeader = headers.find(h => h.includes('name') || h.includes('desc'));
      const itemName = (nameHeader ? row[nameHeader] : values[1] || 'Unknown').trim();
      
      const catHeader = headers.find(h => h.includes('cat') || h.includes('type') || h.includes('group'));
      const category = (catHeader ? row[catHeader] : values[2] || 'General').trim();
      
      const qtyHeader = headers.find(h => h.includes('qty') || h.includes('quant') || h.includes('stock') || h.includes('amount') || h.includes('bal'));
      const qtyStr = qtyHeader ? row[qtyHeader] : values[3];
      const quantity = parseFloat(String(qtyStr).replace(/[^0-9.-]+/g, '')) || 0;
      
      const unitHeader = headers.find(h => h.includes('unit') || h.includes('uom'));
      const unit = (unitHeader ? row[unitHeader] : values[4] || 'pcs').trim();

      const extraData = {};
      headers.forEach(h => {
        if (![codeHeader, nameHeader, catHeader, qtyHeader, unitHeader].includes(h)) {
          extraData[h] = row[h];
        }
      });

      try {
        await InventoryItem.findOneAndUpdate(
          { itemCode },
          { $set: { itemCode, itemName, category, quantity, unit, extraData, lastUpdated: new Date() } },
          { upsert: true, new: true }
        );
        updatedCount++;
      } catch (dbErr) {
        errors.push(`Row ${i} (${itemCode}): ${dbErr.message}`);
      }
    }

    // Cleanup temp file
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    console.log(`Updated ${updatedCount} items, ${errors.length} errors`);
    res.status(200).json({
      success: true,
      message: `Processed ${updatedCount} items successfully.`,
      updatedCount,
      errors
    });
  } catch (error) {
    console.error('uploadCSV error:', error);
    next(error);
  }
};

exports.loadGoods = async (req, res, next) => {
  try {
    const { items, outletId } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid items array' });
    }

    const updatedItems = [];
    for (const item of items) {
      const dbItem = await InventoryItem.findOne({ itemCode: item.itemCode });
      if (!dbItem || dbItem.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient quantity for ${item.itemCode}`
        });
      }
      dbItem.quantity -= item.quantity;
      dbItem.lastUpdated = new Date();
      await dbItem.save();
      updatedItems.push(dbItem);
    }

    res.status(200).json({ success: true, message: 'Goods loaded and inventory deducted', data: updatedItems });
  } catch (error) {
    next(error);
  }
};

exports.reportIssue = async (req, res, next) => {
  try {
    const { type, description, quantity, itemCode } = req.body;
    const issueRef = 'ISSUE-' + Date.now();
    const newIssue = await Issue.create({
      issueRef,
      type,
      source: 'LOADER',
      description: `${itemCode ? `[Item: ${itemCode}] ` : ''}${description}`,
      quantity,
      reportedBy: req.user ? req.user.id : undefined,
    });
    res.status(201).json({ success: true, data: newIssue });
  } catch (error) {
    next(error);
  }
};

// --- Store Manager Inventory & Stock Flow ---

// Get Store Manager's own inventory
exports.getStoreManagerInventory = async (req, res, next) => {
  try {
    const storeManagerId = req.user ? req.user._id : req.query.storeManagerId;
    if (!storeManagerId) {
       return res.status(400).json({ success: false, message: 'Store Manager ID required' });
    }
    const items = await StoreManagerInventory.find({ storeManager: storeManagerId }).sort({ itemCode: 1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

// Store Manager requests stock from Warehouse
exports.requestStock = async (req, res, next) => {
  try {
    const { items } = req.body; // array of { itemCode, itemName, requiredQuantity, availableQuantity, shortageQuantity }
    const storeManagerId = req.user ? req.user._id : req.body.storeManagerId;
    
    if (!storeManagerId || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Invalid request data' });
    }

    const newRequest = await StockRequest.create({
      storeManager: storeManagerId,
      items
    });

    res.status(201).json({ success: true, message: 'Stock request submitted successfully', data: newRequest });
  } catch (error) {
    next(error);
  }
};

// Warehouse Manager or Store Manager gets stock requests
exports.getStockRequests = async (req, res, next) => {
  try {
    const filter = {};
    const storeManagerId = req.query.storeManagerId || (req.user ? req.user._id : null);
    if (storeManagerId && req.query.filterBySelf === 'true') {
      filter.storeManager = storeManagerId;
    }

    const requests = await StockRequest.find(filter).populate('storeManager', 'name email').sort({ requestedAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// Warehouse Manager approves stock request (no inventory changes yet)
exports.approveStockRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const request = await StockRequest.findById(requestId);
    
    if (!request || request.status !== 'REQUESTED') {
      return res.status(400).json({ success: false, message: 'Invalid or already processed request' });
    }

    request.status = 'APPROVED';
    await request.save();

    res.status(200).json({ success: true, message: 'Stock request approved successfully' });
  } catch (error) {
    next(error);
  }
};

// Warehouse Manager rejects stock request
exports.rejectStockRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const request = await StockRequest.findById(requestId);
    
    if (!request || request.status !== 'REQUESTED') {
      return res.status(400).json({ success: false, message: 'Invalid or already processed request' });
    }

    request.status = 'REJECTED';
    request.resolvedAt = new Date();
    await request.save();

    res.status(200).json({ success: true, message: 'Stock request rejected successfully' });
  } catch (error) {
    next(error);
  }
};

// Warehouse Manager marks stock request as sent (Deduct from main warehouse)
exports.markStockRequestSent = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const request = await StockRequest.findById(requestId);
    
    if (!request || request.status !== 'APPROVED') {
      return res.status(400).json({ success: false, message: 'Request must be approved before sending' });
    }

    // Process each item to deduct from Main Inventory
    for (const reqItem of request.items) {
      const mainItem = await InventoryItem.findOne({ itemCode: reqItem.itemCode });
      if (!mainItem || mainItem.quantity < reqItem.shortageQuantity) {
        return res.status(400).json({ 
          success: false, 
          message: `Insufficient stock in Main Warehouse for item: ${reqItem.itemCode}` 
        });
      }
      mainItem.quantity -= reqItem.shortageQuantity;
      mainItem.lastUpdated = new Date();
      await mainItem.save();
    }

    request.status = 'SENT';
    await request.save();

    res.status(200).json({ success: true, message: 'Goods marked as sent and inventory deducted' });
  } catch (error) {
    next(error);
  }
};

// Store Manager confirms received stock (Add to Store Manager Inventory)
exports.confirmStockReceived = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const request = await StockRequest.findById(requestId);
    
    if (!request || request.status !== 'SENT') {
      return res.status(400).json({ success: false, message: 'Request must be sent before it can be received' });
    }

    // Process each item to add to Store Manager Inventory
    for (const reqItem of request.items) {
      const mainItem = await InventoryItem.findOne({ itemCode: reqItem.itemCode });
      
      await StoreManagerInventory.findOneAndUpdate(
        { storeManager: request.storeManager, itemCode: reqItem.itemCode },
        { 
          $inc: { quantity: reqItem.shortageQuantity },
          $set: { 
            itemName: reqItem.itemName || (mainItem ? mainItem.itemName : reqItem.itemCode),
            category: mainItem ? mainItem.category : 'General',
            unit: mainItem ? mainItem.unit : 'pcs',
            extraData: mainItem ? mainItem.extraData : {},
            lastUpdated: new Date()
          }
        },
        { upsert: true, new: true }
      );
    }

    request.status = 'RECEIVED';
    request.resolvedAt = new Date();
    await request.save();

    res.status(200).json({ success: true, message: 'Stock received and inventory updated successfully' });
  } catch (error) {
    next(error);
  }
};
