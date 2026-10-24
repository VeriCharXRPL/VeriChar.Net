'use strict';

/**
 * VeriChar backend entry — exports modules.
 * Testnet only.
 */

module.exports = {
  config: require('./config'),
  api: require('./api'),
  client: require('./client'),
  condition: require('./condition'),
  escrow: require('./escrow'),
  reserves: require('./reserves'),
  monitor: require('./monitor'),
  oracle: require('./oracle'),
  compliance: require('./compliance'),
};
