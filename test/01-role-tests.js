'use strict'

/* eslint-env mocha */

const assert = require('assert')
const { keccak256 } = require('@ethersproject/keccak256')
const { promisify } = require('util')
const ThriveCoinVoterList = artifacts.require('ThriveCoinVoterList')

describe('ThriveCoinVoterList', () => {
  contract('role tests', (accounts) => {
    let contract = null
    const ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000'
    const DUMMY_ROLE = keccak256(Buffer.from('DUMMY_ROLE', 'utf8'))
    const sendRpc = promisify(web3.currentProvider.send).bind(web3.currentProvider)
    let snapshotId = null

    before(async () => {
      contract = await ThriveCoinVoterList.deployed()
      snapshotId = (await sendRpc({ jsonrpc: '2.0', method: 'evm_snapshot', params: [], id: 0 })).result
    })

    after(async () => {
      await sendRpc({ jsonrpc: '2.0', method: 'evm_revert', params: [snapshotId], id: 0 })
    })

    it('hasRole should return true when user has role', async () => {
      const res = await contract.hasRole(ADMIN_ROLE, accounts[0])
      assert.strictEqual(res, true)
    })

    it('hasRole should return false when user does not have role', async () => {
      const res = await contract.hasRole(DUMMY_ROLE, accounts[2])
      assert.strictEqual(res, false)
    })

    it('deployer should have all three roles by default', async () => {
      const res = await contract.hasRole.call(ADMIN_ROLE, accounts[0])
      assert.strictEqual(res, true)
    })

    it('getRoleAdmin should return admin role for all roles', async () => {
      const res = await contract.getRoleAdmin.call(ADMIN_ROLE)
      assert.strictEqual(res, ADMIN_ROLE)
    })

    it('only admin role can grant roles', async () => {
      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const hasRole = await contract.hasRole(DUMMY_ROLE, accounts[3])
      assert.strictEqual(hasRole, true)

      try {
        await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes(`AccessControl: account ${accounts[1].toLowerCase()} is missing role ${ADMIN_ROLE}`),
          true
        )
      }
    })

    it('also admin role can be granted', async () => {
      await contract.grantRole(ADMIN_ROLE, accounts[4], { from: accounts[0] })
      const hasRole = await contract.hasRole(ADMIN_ROLE, accounts[4])
      assert.strictEqual(hasRole, true)
    })

    it('only admin role can revoke role', async () => {
      await contract.revokeRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const hasRole = await contract.hasRole(DUMMY_ROLE, accounts[3])
      assert.strictEqual(hasRole, false)

      try {
        await contract.revokeRole(DUMMY_ROLE, accounts[3], { from: accounts[1] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes(`AccessControl: account ${accounts[1].toLowerCase()} is missing role ${ADMIN_ROLE}`),
          true
        )
      }
    })

    it('account can renounce their role', async () => {
      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const hasRoleBefore = await contract.hasRole(DUMMY_ROLE, accounts[3])
      assert.strictEqual(hasRoleBefore, true)

      await contract.renounceRole(DUMMY_ROLE, accounts[3], { from: accounts[3] })
      const hasRoleAfter = await contract.hasRole(DUMMY_ROLE, accounts[3])
      assert.strictEqual(hasRoleAfter, false)
    })

    it('renounce should emit RoleRevoked event', async () => {
      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const res = await contract.renounceRole(DUMMY_ROLE, accounts[3], { from: accounts[3] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleRevoked')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[3])
      assert.strictEqual(txLog.args.sender, accounts[3])
    })

    it('account can renounce only their role', async () => {
      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })

      try {
        await contract.renounceRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes('AccessControl: can only renounce roles for self'),
          true
        )
      }
    })

    it('grantRole could work for any role', async () => {
      const res = await contract.grantRole(DUMMY_ROLE, accounts[4], { from: accounts[0] })
      const txLog = res.logs[0]

      assert.strictEqual(txLog.event, 'RoleGranted')
      assert.strictEqual(txLog.args.role, DUMMY_ROLE)
      assert.strictEqual(txLog.args.account, accounts[4])
      assert.strictEqual(txLog.args.sender, accounts[0])
    })

    it('role members must be enumerable', async () => {
      await contract.grantRole(DUMMY_ROLE, accounts[3], { from: accounts[0] })
      const users = [accounts[3], accounts[4]]
      const length = await contract.getRoleMemberCount.call(DUMMY_ROLE)

      for (let index = 0; index < length; index++) {
        const res = await contract.getRoleMember(DUMMY_ROLE, index)
        assert.strictEqual(res, users[index])
      }
    })

    it('should allow admin to add a voter', async function () {
      await contract.addVoter(accounts[1], { from: accounts[0] })
      const res = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(res, true)
    })

    it('should deny non-admin accounts from adding a voter', async function () {
      try {
        await contract.addVoter(accounts[1], { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes(`AccessControl: account ${accounts[2].toLowerCase()} is missing role ${ADMIN_ROLE}`),
          true
        )
      }
    })

    it('should allow admin to remove a voter', async function () {
      await contract.addVoter(accounts[1], { from: accounts[0] })
      await contract.removeVoter(accounts[1], { from: accounts[0] })
      const res = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(res, false)
    })

    it('should deny non-admin accounts from removing a voter', async function () {
      try {
        await contract.removeVoter(accounts[1], { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes(`AccessControl: account ${accounts[2].toLowerCase()} is missing role ${ADMIN_ROLE}`),
          true
        )
      }
    })

    it('should allow admin to add voters', async function () {
      await contract.addVoters([accounts[1], accounts[2]], { from: accounts[0] })
      const res = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(res, true)
    })

    it('should deny non-admin accounts from adding voters', async function () {
      try {
        await contract.addVoters([accounts[1], accounts[2]], { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes(`AccessControl: account ${accounts[2].toLowerCase()} is missing role ${ADMIN_ROLE}`),
          true
        )
      }
    })

    it('should allow admin to remove voters', async function () {
      await contract.addVoters([accounts[1], accounts[2], accounts[3]], { from: accounts[0] })
      await contract.removeVoters([accounts[1], accounts[2]], { from: accounts[0] })
      const res = await contract.hasVoteRight(accounts[1])
      assert.strictEqual(res, false)
    })

    it('should deny non-admin accounts from removing voters', async function () {
      await contract.addVoters([accounts[1], accounts[2], accounts[3]], { from: accounts[0] })
      try {
        await contract.removeVoters([accounts[1], accounts[2]], { from: accounts[2] })
        throw new Error('Should not reach here')
      } catch (err) {
        assert.strictEqual(
          err.message.includes(`AccessControl: account ${accounts[2].toLowerCase()} is missing role ${ADMIN_ROLE}`),
          true
        )
      }
    })
  })
})
