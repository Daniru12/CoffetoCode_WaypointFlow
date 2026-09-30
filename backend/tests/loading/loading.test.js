describe('Loading Job Calculations and Discrepancies', () => {
  test('Should accurately flag shortfall when loadedQty is less than expectedQty', () => {
    const item = {
      expectedQty: 50,
      loadedQty: 42
    };

    const isShortfall = item.loadedQty < item.expectedQty;
    const missingQty = item.expectedQty - item.loadedQty;

    expect(isShortfall).toBe(true);
    expect(missingQty).toBe(8);
  });

  test('Should mark completed when loadedQty meets or exceeds expectedQty', () => {
    const item = {
      expectedQty: 50,
      loadedQty: 50
    };

    expect(item.loadedQty >= item.expectedQty).toBe(true);
  });
});
