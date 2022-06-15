// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const BerezkaDeposit = await hre.ethers.getContractAt("BerezkaDeposit", "0x6a061d637c636135CFefb92316C4804Ea04F63Be");

  const setOracleTx = await BerezkaDeposit.setOracleAddress("0x8b0Cbb877105A96B9b73775dE1Fd3e92cCD4b97e")
  console.log("setOracleTx: ", setOracleTx)
  console.log("Oracle Address setup tx:", setOracleTx.hash);
  
  const addWhitelistTokensTx = await BerezkaDeposit.addWhitelistTokens(["0xd92e713d051c37ebb2561803a3b5fbabc4962431", "0xc7AD46e0b8a400Bb3C915120d284AafbA8fc4735"])
  await addWhitelistTokensTx.wait()
  console.log("addWhitelistTokens tx:", addWhitelistTokensTx.hash);

  const addDaoTx = await BerezkaDeposit.addDao("0x72Fe9756B739A8780306778BcB0381BA751622e9" /* Community token */, "0x9820de34c2ef4c86ea1ec0033be1099934fe81f0" /* Community token manager*/, "0x3db41c21e51670ab6303b7961bd035fbd595cf75" /* Agent */)
  await addDaoTx.wait()
  console.log("addDao tx:", addDaoTx.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
