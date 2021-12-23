const { Wallet } = require("@ethersproject/wallet");
const { expect, util } = require("chai");
const { utils } = require("ethers");
const { ethers, network } = require("hardhat");

const emptyAddress = "0x0000000000000000000000000000000000000000"

const deployContract = async () => {
  const DaoContract = await ethers.getContractFactory("BerezkaDaoManager");
  const daoContract = await DaoContract.deploy();
  return await daoContract.deployed();
}

describe("DAO Manager", function () {

  it("Should add DAO", async function() {
    const [_, token, tokens, agent] = await ethers.getSigners()

    const daoContract = await deployContract();
    await daoContract.addDao(
      token.address,
      tokens.address,
      agent.address
    )

    const address = await daoContract._agentAddress(token.address)
    expect(address).to.be.eq(agent.address)
  })

  it("Should not return empty agent address for DAO", async function() {
    const [_, token, tokens, agent] = await ethers.getSigners()

    const daoContract = await deployContract();
    await daoContract.addDao(
      token.address,
      tokens.address,
      agent.address
    )
    
    await expect(
      daoContract._agentAddress(tokens.address)
    ).to.be.revertedWith("NO_DAO_FOR_TOKEN")
  })

  it("Should allow to delete DAO", async function() {
    const [_, token, tokens, agent] = await ethers.getSigners()

    const daoContract = await deployContract();
    await daoContract.addDao(
      token.address,
      tokens.address,
      agent.address
    )

    await daoContract.deleteDao(
      token.address,
    )
    
    await expect(
      daoContract._agentAddress(token.address)
    ).to.be.revertedWith("NO_DAO_FOR_TOKEN")
  })
});
