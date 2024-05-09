import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployToken() {
    const [owner, otherAccount1, otherAccount2, otherAccount3] = await hre.ethers.getSigners()
    const USDT = await hre.ethers.getContractAt('IERC20', '0xdAC17F958D2ee523a2206206994597C13D831ec7')

    const usdtVaults = await hre.ethers.getImpersonatedSigner('0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503')

    await (await USDT.connect(usdtVaults).transfer(otherAccount1, ethers.parseUnits('1000', 6))).wait()
    await (await USDT.connect(usdtVaults).transfer(otherAccount2, ethers.parseUnits('1000', 6))).wait()
    await (await USDT.connect(usdtVaults).transfer(otherAccount3, ethers.parseUnits('1000', 6))).wait()

    const Token = await hre.ethers.getContractFactory("Token");
    const startDate = BigInt(Math.floor(Date.now() / 1000) + 120)
    const endDate = startDate + 600n
    const token = await Token.deploy(1000000000000000000000000n, startDate, endDate, 6000n, 10n);

    return { token, otherAccount1, otherAccount2, otherAccount3, owner, USDT, startDate, endDate };
  }

  describe("Token", function () {
    it("Enter ticks", async function () {
      const { token, owner, otherAccount1, otherAccount2, otherAccount3, USDT, startDate, endDate } = await loadFixture(deployToken);

      await (await USDT.connect(otherAccount1).approve(token.target, ethers.parseUnits('500', 6))).wait()
      await (await USDT.connect(otherAccount2).approve(token.target, ethers.parseUnits('500', 6))).wait()
      await (await USDT.connect(otherAccount3).approve(token.target, ethers.parseUnits('500', 6))).wait()
      await (await token.connect(otherAccount1).enter(ethers.parseUnits('500', 6))).wait()

      await time.increaseTo(Number(startDate) + 100);

      console.log(await token.getCurrentTickIndex())
      await (await token.connect(otherAccount2).enter(ethers.parseUnits('300', 6))).wait()
      await (await token.connect(otherAccount3).enter(ethers.parseUnits('200', 6))).wait()

      await time.increaseTo(Number(startDate) + 160);

      console.log(await token.getCurrentTickIndex())
      await (await token.connect(otherAccount3).exit()).wait()

      await time.increaseTo(Number(endDate) + 100)
      await (await token.connect(otherAccount1).claim()).wait()
      await (await token.connect(otherAccount2).claim()).wait()

      console.log(await token.balanceOf(otherAccount1))
      console.log(await token.balanceOf(otherAccount2))

      console.log(await token.balanceOf(token.target))
      
      await (await token.createPair()).wait()
      
      console.log(await USDT.balanceOf(owner.address))
      console.log(await token.pair())

      console.log(await token.tickStates(1), await token.tickStates(2), await token.tickStates(3), await token.tickStates(10))

    });
  });

});
