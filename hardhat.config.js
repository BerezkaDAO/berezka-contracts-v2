require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require('solidity-coverage');
require("hardhat-gas-reporter");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000,
          }
        }
      },
      {
        version: "0.4.17",
      }
    ]
  },
  networks: {
    rinkeby: {
      url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env['RINKEBY_ALCHEMY_API_KEY']}`,
      accounts: process.env['RINKEBY_PRIVATE_KEY'] ? [`0x${process.env['RINKEBY_PRIVATE_KEY']}`] : []
    },
    mainnet: {
      url: `https://eth-mainnet.alchemyapi.io/v2/${process.env['MAINNET_ALCHEMY_API_KEY']}`,
      accounts: process.env['MAINNET_PRIVATE_KEY'] ? [`0x${process.env['MAINNET_PRIVATE_KEY']}`] : []
    }
  },
  etherscan: {
    apiKey: process.env['ETHERSCAN_API_KEY']
  },
  mocha: {
    timeout: 80000
  }
};
