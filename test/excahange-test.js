const { Wallet } = require("@ethersproject/wallet");
const { expect, util } = require("chai");
const { utils } = require("ethers");
const { ethers, network } = require("hardhat");

const deployContract = async () => {
  const ExchangeContract = await ethers.getContractFactory("BerezkaStableCoinManager");
  const exchangeContract = await ExchangeContract.deploy();
  return await exchangeContract.deployed();
}

const deployToken = async (name, decimals = 18) => {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockERC20 = await MockERC20.deploy(name, name, decimals);
  return await mockERC20.deployed();
}

describe("Exchange", function () {

  it("Should correctly compute exchange rate for 10**6 token", async function() {
    const OracleContract = await deployContract();
    const token = await deployToken("USDT", 6)
    const price = "4199389"
    const amount = "" + (1 * 10 ** 18)
    const expected = "4199389"
    const result = await OracleContract.computeExchange(amount, price, token.address)
    expect(result).to.eq(expected)
  })

  it("Should correctly compute exchange rate for 10**18 token", async function() {
    const OracleContract = await deployContract();
    const token = await deployToken("DAI", 18)
    const price = "4199389"
    const amount = "" + (1 * 10 ** 18)
    const expected = "4199389000000000000"
    const result = await OracleContract.computeExchange(amount, price, token.address)
    expect(result).to.eq(expected)
  })
});
