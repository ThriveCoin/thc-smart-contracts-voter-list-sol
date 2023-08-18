'use strict'

const ThriveCoinVoterList = artifacts.require('ThriveCoinVoterList')

module.exports = async function (deployer, network, accounts) {
  if (['development', 'test'].includes(network)) {
    const owner = accounts[0]

    await deployer.deploy(ThriveCoinVoterList, { from: owner })
  }
}
