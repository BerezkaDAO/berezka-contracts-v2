const { Wallet } = require("@ethersproject/wallet");
const { expect, util } = require("chai");
const { utils } = require("ethers");
const { ethers, network } = require("hardhat");

const oraclePrivateKey = "746360fcdf1927ce38bb517f0143d5f1d2eeb568d257bab2bca7fce1826dbdd0"
const oracleAddress = "0xAb66dE3DF08318922bb4cE15553E4C2dCf9187A1"

const deployContract = async () => {
  const OracleContract = await ethers.getContractFactory("BerezkaOracleClient");
  const oracleContract = await OracleContract.deploy();
  return await oracleContract.deployed();
}

const signPrice = async(price, ts, token) => {
  const wallet = new ethers.Wallet(oraclePrivateKey)
  const hash = utils.solidityKeccak256(["uint256", "uint256", "address"], [price, ts, token])
  return await wallet.signMessage(ethers.utils.arrayify(hash))
}

describe("Oracle", function () {
  
  it("Should validate oracle signature", async function () {
    const OracleContract = await deployContract();

    const price = "13121145859699615700"
    const ts = "1639597654"
    const token = "0xa579b0ee7f64ea4da01bf43ab173a597d9bb7bd4"

    const signature = await signPrice(price, ts, token)

    const result = await OracleContract.recover(price, ts, token, signature)
    expect(result).to.eq(oracleAddress)
  });

  it("Should accept valid oracle signature", async function() {
    const OracleContract = await deployContract();
    const price = "13121145859699615700"
    const ts = "1639597654"
    const token = "0xa579b0ee7f64ea4da01bf43ab173a597d9bb7bd4"

    const signature = await signPrice(price, ts, token)
    const result = await OracleContract.isValidSignature(price, ts, token, signature)
    expect(result).to.eq(true)
  })

  it("Should accept valid oracle (Web) signature", async function() {
    const OracleContract = await deployContract();
    const price = "2299096"
    const ts = "1639827636"
    const token = "0xa579b0ee7f64ea4da01bf43ab173a597d9bb7bd4"
    const signature = "0x221f94f56a28cef420a07ec43272e59bd8d3166816a96078760b0ce1cbebbcfe4cacb225c2eebf2a269fe6e4d4426c2557ce0776a3b8922c99759e8c7492730a1c"
    const result = await OracleContract.isValidSignature(price, ts, token, signature)
    expect(result).to.eq(true)
  })

  it("Should reject invalid oracle signature", async function() {
    const OracleContract = await deployContract();
    const price = "2299096"
    const ts = "1639827636"
    const tsChanged = "1639827635"
    const token = "0xa579b0ee7f64ea4da01bf43ab173a597d9bb7bd4"
    const signature = await signPrice(price, ts, token)
    const result = await OracleContract.isValidSignature(price, tsChanged, token, signature)
    expect(result).to.eq(false)
  })

  it ("Should verify timestamp", async function() {
    const OracleContract = await deployContract();

    const latestBlock = await ethers.provider.getBlock("latest")
    const nowSec = latestBlock.timestamp

    const tsPlus100Sec = "" + (nowSec + 100)
    const tsMinus100Sec = "" + (nowSec - 100)
    const tsPlus36010Sec = "" + (nowSec + 3610)
    const tsMinus36010Sec = "" + (nowSec - 3610)

    expect(
      await OracleContract.isValidSignatureDate(tsPlus100Sec)
    ).to.eq(true)
    expect(
      await OracleContract.isValidSignatureDate(tsMinus100Sec)
    ).to.eq(true)
    
    
    expect(
      await OracleContract.isValidSignatureDate(tsPlus36010Sec)
    ).to.eq(false)
    expect(
      await OracleContract.isValidSignatureDate(tsMinus36010Sec)
    ).to.eq(false)
  })
});
