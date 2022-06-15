const { expect  } = require("chai");
const { utils } = require("ethers");
const { ethers } = require("hardhat");

const oraclePrivateKey = "746360fcdf1927ce38bb517f0143d5f1d2eeb568d257bab2bca7fce1826dbdd0"

const deployAgent = async () => {
  const MockAgentContract = await ethers.getContractFactory("MockAgent");
  const mockAgentContract = await MockAgentContract.deploy();
  return await mockAgentContract.deployed();
}

const deployTokenManager = async (name) => {
  const MockTokensContract = await ethers.getContractFactory("MockTokens");
  const mockTokensContract = await MockTokensContract.deploy(name);
  return await mockTokensContract.deployed();
}

const deployContract = async () => {
  const DepositContract = await ethers.getContractFactory("BerezkaDeposit");
  const depositContract = await DepositContract.deploy();
  return await depositContract.deployed();
}

const deployToken = async (name, decimals = 6) => {
  const TetherToken = await ethers.getContractFactory("TetherToken");
  const tetherToken = await TetherToken.deploy(100000 * 10 ** decimals, name, name, decimals);
  return await tetherToken.deployed();
}

const tokenAt = async (address) => {
  const TetherToken = await ethers.getContractFactory("TetherToken");
  return await TetherToken.attach(address)
}

const signPrice = async (price, ts, token) => {
  const wallet = new ethers.Wallet(oraclePrivateKey)
  const hash = utils.solidityKeccak256(["uint256", "uint256", "address"], [price, ts, token])
  return await wallet.signMessage(ethers.utils.arrayify(hash))
}

describe("Deposit (USDT)", function () {

  it("Should Deposit", async function () {
    const [_, investor] = await ethers.getSigners()
    // Deploy Deposit contract
    //
    const depositContract = await deployContract()

    // Deploy DAO Tokens and Stablecoin Token contracts
    //
    const daoTokenManager = await deployTokenManager("DAO")
    const daoTokenAddress = await daoTokenManager.daoToken()

    const usdtToken = await deployToken("USDT", 6)

    // Sign price data by oracle (emulate FLEX price)
    //
    const price = "4199389"                   // ~4.19 stablecoins per token
    const amount = "100000000000000000000"    // 100 tokens in 10 ** 18  
    const ts = "" + (Math.floor(new Date().getTime() / 1000)) // current date
    const signature = await signPrice(price, ts, daoTokenAddress)

    // Deploy agent contract
    //
    const agent = await deployAgent()

    // Mint some (price ** 100) stablecoins to investor address
    //
    await usdtToken.transfer(investor.address, "419938900")
    await usdtToken.connect(investor).approve(
      depositContract.address,
      "419938900"
    )

    // Add USDT to stablecoins whitelist
    //
    await depositContract.addWhitelistTokens([usdtToken.address])

    // Add DAO configuration 
    //
    await depositContract.addDao(
      daoTokenAddress,          // DAO Token Manager Contract Address
      daoTokenManager.address,  // DAO Token Address
      agent.address             // DAO Agent Address
    )

    // Deposit all investor's tokens in exchange to stablecoins
    //
    const result = await depositContract.connect(investor).deposit(
      amount,
      daoTokenAddress,
      usdtToken.address,
      price,
      ts,
      signature,
      ""
    )

    // Verify that after Deposit investor gets it's DAO token's minted
    //
    const daoToken = await tokenAt(daoTokenAddress)
    const balanceOfInvestor = await daoToken.balanceOf(investor.address)
    const totalSupply = await daoToken.totalSupply()

    expect(balanceOfInvestor).to.eq("100000000000000000000")
    expect(totalSupply).to.eq("100000000000000000000")

    // Verify that after Deposit agent gets stablecoins (419.9389)
    //
    const stableBalanceOfAgent = await usdtToken.balanceOf(agent.address)

    expect(stableBalanceOfAgent).to.eq(419938900)
  })

  it("Should NOT Deposit 0 tokens", async function () {
    const [_, investor] = await ethers.getSigners()
    // Deploy Deposit contract
    //
    const depositContract = await deployContract()

    // Deploy DAO Tokens and Stablecoin Token contracts
    //
    const daoTokenManager = await deployTokenManager("DAO")
    const daoTokenAddress = await daoTokenManager.daoToken()

    const usdtToken = await deployToken("USDT", 6)

    // Sign price data by oracle (emulate FLEX price)
    //
    const price = "4199389"                   // ~4.19 stablecoins per token
    const amount = "100000000000000000000"    // 100 tokens in 10 ** 18  
    const ts = "" + (Math.floor(new Date().getTime() / 1000)) // current date
    const signature = await signPrice(price, ts, daoTokenAddress)

    // Deploy agent contract
    //
    const agent = await deployAgent()

    // Mint some (price ** 100) stablecoins to investor address
    //
    await usdtToken.transfer(investor.address, "419938900")
    await usdtToken.connect(investor).approve(
      depositContract.address,
      "419938900"
    )

    // Add USDT to stablecoins whitelist
    //
    await depositContract.addWhitelistTokens([usdtToken.address])

    // Add DAO configuration 
    //
    await depositContract.addDao(
      daoTokenAddress,          // DAO Token Manager Contract Address
      daoTokenManager.address,  // DAO Token Address
      agent.address             // DAO Agent Address
    )

    // Deposit all investor's tokens in exchange to stablecoins
    //
    await expect(depositContract.connect(investor).deposit(
      "0",
      daoTokenAddress,
      usdtToken.address,
      price,
      ts,
      signature,
      ""
    )
    ).to.be.revertedWith("ZERO_TOKEN_AMOUNT")
  })

  it("Should NOT Deposit 0 tokens", async function () {
    const [_, investor] = await ethers.getSigners()
    // Deploy Deposit contract
    //
    const depositContract = await deployContract()

    // Deploy DAO Tokens and Stablecoin Token contracts
    //
    const daoTokenManager = await deployTokenManager("DAO")
    const daoTokenAddress = await daoTokenManager.daoToken()

    const usdtToken = await deployToken("USDT", 6)

    // Sign price data by oracle (emulate FLEX price)
    //
    const price = "4199389"                   // ~4.19 stablecoins per token
    const amount = "100000000000000000000"    // 100 tokens in 10 ** 18  
    const ts = "" + (Math.floor(new Date().getTime() / 1000)) // current date
    const signature = await signPrice(price, ts, daoTokenAddress)

    // Deploy agent contract
    //
    const agent = await deployAgent()

    // Mint some (price ** 100) stablecoins to investor address
    //
    await usdtToken.transfer(investor.address, "41993890")
    await usdtToken.connect(investor).approve(
      depositContract.address,
      "419938900"
    )

    // Add USDT to stablecoins whitelist
    //
    await depositContract.addWhitelistTokens([usdtToken.address])

    // Add DAO configuration 
    //
    await depositContract.addDao(
      daoTokenAddress,          // DAO Token Manager Contract Address
      daoTokenManager.address,  // DAO Token Address
      agent.address             // DAO Agent Address
    )

    // Deposit all investor's tokens in exchange to stablecoins
    //
    await expect(depositContract.connect(investor).deposit(
      amount,
      daoTokenAddress,
      usdtToken.address,
      price,
      ts,
      signature,
      ""
    )
    ).to.be.reverted
  })

});
