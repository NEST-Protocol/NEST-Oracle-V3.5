require("@nomiclabs/hardhat-waffle");
require('hardhat-contract-sizer');
require("hardhat-deploy-ethers");
require("hardhat-gas-reporter");
require('@openzeppelin/hardhat-upgrades');


//const config = require('./.private.json');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.6.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21,
    enabled: (process.env.REPORT_GAS) ? true : false
  },
  /*networks: {
    goerli: {
      url: `https://goerli.infura.io/v3/${config.infura.goerli.apiKey}`,
      accounts: [config.account.goerli.key],
      gas: 100000
    },
    kovan: {
      url: `https://eth-kovan.alchemyapi.io/v2/${config.alchemy.kovan.apiKey}`,
      accounts: [config.account.kovan.key],
      gasPrice:21e9
    },
  },*/
}
