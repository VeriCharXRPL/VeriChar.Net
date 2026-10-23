'use strict';

const memoHex = (value) => Buffer.from(value, 'utf8').toString('hex').toUpperCase();

function vericharMemo() {
  return [{
    Memo: {
      MemoType: memoHex('application'),
      MemoData: memoHex('VeriChar'),
    },
  }];
}

module.exports = { vericharMemo };
