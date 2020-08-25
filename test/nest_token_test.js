const { accounts, contract, web3 } = require('@openzeppelin/test-environment');
const { expect } = require('chai');
require('chai').should();
const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const IBNEST = contract.fromArtifact("IBNEST");
const IterableMapping = contract.fromArtifact("IterableMapping");

// https://docs.openzeppelin.com/test-environment/0.1/api
// https://docs.openzeppelin.com/test-helpers/0.5/api

describe('NEST V3.5', function () {
    const [deployer, userA, userB] = accounts;



    before(async () => {
        await IBNEST.detectNetwork();
        iterableMapping = await IterableMapping.new({ from: deployer });
        IBNEST.link("IterableMapping", iterableMapping.address); // link libraries
        NestToken = await IBNEST.new({ from: deployer });
    });

    describe('template', function () {
        it("test", async () => {
        });
    });

    describe('NEST Token', function () {
        it("should have correct totalSupply", async () => {
            const expectedTotalSupply = web3.utils.toWei(new BN("10000000000"), 'ether');
            let totalSupply = await NestToken.totalSupply();
            expect(totalSupply).to.bignumber.equal(expectedTotalSupply);
        })

        it("should transfer correctly", async () => {
            let amount = web3.utils.toWei(new BN("100"), 'ether');
            let result = await NestToken.transfer(userA, amount, { from: deployer });
            console.log(`transfer NEST token to a new user, gasUsed: ${result.receipt.gasUsed}`);
            let balanceOfUserA = await NestToken.balanceOf(userA);
            expect(balanceOfUserA).to.bignumber.equal(amount);
        })

        it("should transfer fail", async () => {
            let amount = web3.utils.toWei(new BN("10000000001"), 'ether');
            await expectRevert.unspecified(
                NestToken.transfer(userA, amount, { from: deployer })
            );
        })
    });
})