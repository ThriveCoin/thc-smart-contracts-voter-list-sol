'use strict'

/* eslint-env mocha */

const assert = require('assert')
const ThriveCoinVoterList = artifacts.require('ThriveCoinVoterList')

describe('ThriveCoinVoterList', () => {
  contract('voter tests', (accounts) => {
    let contract = null

    beforeEach(async () => {
      contract = await ThriveCoinVoterList.new({ from: accounts[0] })
    })

    it('add voter should set flag to true for account', async function () {
      let hasRight = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(hasRight, false)

      await contract.addVoter(accounts[1], { from: accounts[0] })

      hasRight = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(hasRight, true)
    })

    it('add voter should set flag to true for account even if account had flag true previously', async function () {
      await contract.addVoter(accounts[1], { from: accounts[0] })
      let hasRight = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(hasRight, true)

      await contract.addVoter(accounts[1], { from: accounts[0] })

      hasRight = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(hasRight, true)
    })

    it('remove voter should set flag to false for account', async function () {
      let hasRight = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(hasRight, false)

      await contract.addVoter(accounts[1], { from: accounts[0] })
      hasRight = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(hasRight, true)

      await contract.removeVoter(accounts[1], { from: accounts[0] })

      hasRight = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(hasRight, false)
    })

    it('remove voter should set flag to false for account even if account had flag false previously', async function () {
      let hasRight = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(hasRight, false)

      await contract.removeVoter(accounts[1], { from: accounts[0] })

      hasRight = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(hasRight, false)
    })

    it('should allow admin to add multiple voters', async function () {
      await contract.addVoters([accounts[1], accounts[2], accounts[3]], { from: accounts[0] })
      const hasRight1 = await contract.hasVoteRight(accounts[1])
      const hasRight2 = await contract.hasVoteRight(accounts[2])
      const hasRight3 = await contract.hasVoteRight(accounts[3])

      assert.strictEqual(hasRight1, true)
      assert.strictEqual(hasRight2, true)
      assert.strictEqual(hasRight3, true)
    })

    it('should allow admin to remove multiple voters', async function () {
      await contract.addVoters([accounts[1], accounts[2], accounts[3]], { from: accounts[0] })
      await contract.removeVoters([accounts[1], accounts[2]], { from: accounts[0] })

      const hasRight1 = await contract.hasVoteRight(accounts[1])
      const hasRight2 = await contract.hasVoteRight(accounts[2])
      const hasRight3 = await contract.hasVoteRight(accounts[3])

      assert.strictEqual(hasRight1, false)
      assert.strictEqual(hasRight2, false)
      assert.strictEqual(hasRight3, true)
    })
  })
})
