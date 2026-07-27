import React from 'react';
import ReceiptHistory from '../shared/ReceiptHistory';

const Receipts = () => {
  return (
    <div className="w-full">
      <ReceiptHistory defaultCategory="All" />
    </div>
  );
};

export default Receipts;
