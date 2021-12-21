const { Wallet } = require("@ethersproject/wallet");
const { expect, util } = require("chai");
const { utils } = require("ethers");
const { ethers, network } = require("hardhat");

const oraclePrivateKey = "746360fcdf1927ce38bb517f0143d5f1d2eeb568d257bab2bca7fce1826dbdd0"
const oracleAddress = "0xAb66dE3DF08318922bb4cE15553E4C2dCf9187A1"

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
  const WithdrawContract = await ethers.getContractFactory("BerezkaWithdraw");
  const withdrawContract = await WithdrawContract.deploy();
  return await withdrawContract.deployed();
}

const deployToken = async (name, decimals = 18) => {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockERC20 = await MockERC20.deploy(name, name, decimals);
  return await mockERC20.deployed();
}

const tokenAt = async (address) => {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  return await MockERC20.attach(address)
}

const signPrice = async(price, ts, token) => {
  const wallet = new ethers.Wallet(oraclePrivateKey)
  const hash = utils.solidityKeccak256(["uint256", "uint256", "address"], [price, ts, token])
  return await wallet.signMessage(ethers.utils.arrayify(hash))
}

describe("Withdraw", function () {
  it("Should deploy", async function () {
    await deployContract()
  });

  it("Should validate oracle signature", async function () {
    const withdrawContract = await deployContract();

    const price = "13121145859699615700"
    const ts = "1639597654"
    const token = "0xa579b0ee7f64ea4da01bf43ab173a597d9bb7bd4"

    const signature = await signPrice(price, ts, token)

    const result = await withdrawContract.recover(price, ts, token, signature)
    expect(result).to.eq(oracleAddress)
  });

  it("Should accept valid oracle signature", async function() {
    const withdrawContract = await deployContract();
    const price = "13121145859699615700"
    const ts = "1639597654"
    const token = "0xa579b0ee7f64ea4da01bf43ab173a597d9bb7bd4"

    const signature = await signPrice(price, ts, token)
    const result = await withdrawContract.isValidSignature(price, ts, token, signature)
    expect(result).to.eq(true)
  })

  it("Should accept valid oracle (Web) signature", async function() {
    const withdrawContract = await deployContract();
    const price = "2299096"
    const ts = "1639827636"
    const token = "0xa579b0ee7f64ea4da01bf43ab173a597d9bb7bd4"
    const signature = "0x221f94f56a28cef420a07ec43272e59bd8d3166816a96078760b0ce1cbebbcfe4cacb225c2eebf2a269fe6e4d4426c2557ce0776a3b8922c99759e8c7492730a1c"
    const result = await withdrawContract.isValidSignature(price, ts, token, signature)
    expect(result).to.eq(true)
  })

  it("Should reject invalid oracle signature", async function() {
    const withdrawContract = await deployContract();
    const price = "2299096"
    const ts = "1639827636"
    const tsChanged = "1639827635"
    const token = "0xa579b0ee7f64ea4da01bf43ab173a597d9bb7bd4"
    const signature = await signPrice(price, ts, token)
    const result = await withdrawContract.isValidSignature(price, tsChanged, token, signature)
    expect(result).to.eq(false)
  })

  it("Should correctly compute exchange rate for 10**6 token", async function() {
    const withdrawContract = await deployContract();
    const token = await deployToken("USDT", 6)
    const price = "4199389"
    const amount = "" + (1 * 10 ** 18)
    const expected = "4199389"
    const result = await withdrawContract.computeExchange(amount, price, token.address)
    expect(result).to.eq(expected)
  })

  it("Should correctly compute exchange rate for 10**18 token", async function() {
    const withdrawContract = await deployContract();
    const token = await deployToken("DAI", 18)
    const price = "4199389"
    const amount = "" + (1 * 10 ** 18)
    const expected = "4199389000000000000"
    const result = await withdrawContract.computeExchange(amount, price, token.address)
    expect(result).to.eq(expected)
  })

  it ("Should verify timestamp", async function() {
    const withdrawContract = await deployContract();
    const tsPlus100Sec = "" + (Math.floor(new Date().getTime() / 1000) + 100)
    const tsMinus100Sec = "" + (Math.floor(new Date().getTime() / 1000) - 100)
    const tsPlus36010Sec = "" + (Math.floor(new Date().getTime() / 1000) + 3610)
    const tsMinus36010Sec = "" + (Math.floor(new Date().getTime() / 1000) - 3610)

    expect(
      await withdrawContract.isValidSignatureDate(tsPlus100Sec)
    ).to.eq(true)
    expect(
      await withdrawContract.isValidSignatureDate(tsMinus100Sec)
    ).to.eq(true)
    expect(
      await withdrawContract.isValidSignatureDate(tsPlus36010Sec)
    ).to.eq(false)
    expect(
      await withdrawContract.isValidSignatureDate(tsMinus36010Sec)
    ).to.eq(false)
  })
  
  it("Should withdraw", async function() {
    const [_, investor] = await ethers.getSigners()
    // Deploy withdraw contract
    //
    const withdrawContract = await deployContract()

    // Deploy DAO Tokens and Stablecoin Token contracts
    //
    const daoTokenManager = await deployTokenManager("DAO")
    const daoTokenAddress = await daoTokenManager.daoToken()

    const usdcToken = await deployToken("USDC", 6)

    // Sign price data by oracle (emulate FLEX price)
    //
    const price = "4199389"                   // ~4.19 stablecoins per token
    const amount = "100000000000000000000"    // 100 tokens in 10 ** 18  
    const ts = "" + (Math.floor(new Date().getTime() / 1000)) // current date
    const signature = await signPrice(price, ts, daoTokenAddress)

    // Mint amount of DAO tokens to investor's address (emulate DAO entry)
    //
    await daoTokenManager.mint(investor.address, amount)

    // Deploy agent contract
    //
    const agent = await deployAgent()

    // Mint some (price ** 100) stablecoins to Agent address (emulate Withdraw pool)
    //
    await usdcToken.mint(agent.address, price + "00")

    // Add USDC to stablecoins whitelist
    //
    await withdrawContract.addWhitelistTokens([usdcToken.address])

    // Add DAO configuration 
    //
    await withdrawContract.addDao(
      daoTokenAddress,          // DAO Token Manager Contract Address
      daoTokenManager.address,  // DAO Token Address
      agent.address             // DAO Agent Address
    )

    // Withdraw all investor's tokens in exchange to stablecoins
    //
    const result = await withdrawContract.connect(investor).withdraw(
      amount,
      daoTokenAddress,
      usdcToken.address,
      price,
      ts,
      signature
    )

    // Verify that after withdraw investor gets it's DAO token's burned
    //
    const daoToken = await tokenAt(daoTokenAddress)
    const balanceOfInvestor = await daoToken.balanceOf(investor.address)
    const totalSupply = await daoToken.totalSupply()

    expect(balanceOfInvestor).to.eq(0)
    expect(totalSupply).to.eq(0)

    // Verify that after withdraw investor gets stablecoins (419.9389)
    //
    const stableBalanceOfInvestor = await usdcToken.balanceOf(investor.address)

    expect(stableBalanceOfInvestor).to.eq(419938900)
  })
  
  
});
