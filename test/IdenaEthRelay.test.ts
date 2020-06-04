import path = require('path');
import { should } from 'chai';
import * as bip39 from 'bip39';
const hdkey = require('ethereumjs-wallet/hdkey');
import { IdenaEthRelayInstance } from '../types/truffle-contracts';

require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

if (!process.env.GANACHE_MNEMONIC) {
    console.error("Must provide ganache mnemonic in the .env file");
}

const IdenaEthRelay: Truffle.Contract<IdenaEthRelayInstance> = artifacts.require('IdenaEthRelay');
should();

/** @test {IdenaEthRelay} contract */
contract('IdenaEthRelay', (accounts) => {

    let IdenaEthRelayInstance: IdenaEthRelayInstance;
    const identities0 = [2, 5, 6, 7, 8, 9];
    const identities2 = [2, 5, 6, 7, 8, 9, 11];
    const identities5 = [1, 5, 6, 7, 8, 9, 11];
    const identities7 = [1, 5, 6, 7, 8, 9, 11];
    const identities8 = [1, 5, 6, 7, 8, 10, 11];
    const identities9 = [2, 5, 6, 7, 8, 9, 11];
    const identities00 = [5, 6, 7, 8, 9, 11];

    beforeEach(async () => {
        IdenaEthRelayInstance = await IdenaEthRelay.new("0x" + accounts.map((account, i) => identities0.includes(i) ? account.slice(2) : "").join(""));
    });

    /**
     * Test the constructor
     * @test {IdenaEthRelay#}
     */
    it('...should be deployed succesfully', async () => {
        // all addresses in accounts should be valid identities
        for (let i in identities0) {
            ((await IdenaEthRelayInstance.identities("0", accounts[identities0[i]]))[0]).should.be.equal(true);
        }
    });

    /**
     * Test the validation of identitites
     * @test {IdenaEthRelay#relayState}
     */
    it('...should relay identities succesfully', async () => {
        const message2 = "0x" + accounts.map((account, i) => identities2.includes(i) ? account.slice(2) : "").join("");
        const message5 = "0x" + accounts.map((account, i) => identities5.includes(i) ? account.slice(2) : "").join("");
        const message7 = "0x" + accounts.map((account, i) => identities7.includes(i) ? account.slice(2) : "").join("");
        const message8 = "0x" + accounts.map((account, i) => identities8.includes(i) ? account.slice(2) : "").join("");
        const message9 = "0x" + accounts.map((account, i) => identities9.includes(i) ? account.slice(2) : "").join("");

        const seed = await bip39.mnemonicToSeed(process.env.GANACHE_MNEMONIC ? process.env.GANACHE_MNEMONIC : "");
        const hdk = hdkey.fromMasterSeed(seed);

        const addr_node2 = hdk.derivePath("m/44'/60'/0'/0/2"); //m/44'/60'/0'/0/0 is derivation path for the first account. m/44'/60'/0'/0/1 is the derivation path for the second account and so on
        const private_key2 = addr_node2.getWallet().getPrivateKey();
        const addr_node5 = hdk.derivePath("m/44'/60'/0'/0/5");
        const private_key5 = addr_node5.getWallet().getPrivateKey();
        const addr_node7 = hdk.derivePath("m/44'/60'/0'/0/7");
        const private_key7 = addr_node7.getWallet().getPrivateKey();
        const addr_node8 = hdk.derivePath("m/44'/60'/0'/0/8");
        const private_key8 = addr_node8.getWallet().getPrivateKey();
        const addr_node9 = hdk.derivePath("m/44'/60'/0'/0/9");
        const private_key9 = addr_node9.getWallet().getPrivateKey()

        await IdenaEthRelayInstance.relayState(message2, web3.eth.accounts.sign(web3.utils.soliditySha3(message2), "0x" + private_key2.toString('hex')).signature, { from: accounts[2] });
        await IdenaEthRelayInstance.relayState(message5, web3.eth.accounts.sign(web3.utils.soliditySha3(message5), "0x" + private_key5.toString('hex')).signature, { from: accounts[5] });
        await IdenaEthRelayInstance.relayState(message7, web3.eth.accounts.sign(web3.utils.soliditySha3(message7), "0x" + private_key7.toString('hex')).signature, { from: accounts[7] });
        await IdenaEthRelayInstance.relayState(message8, web3.eth.accounts.sign(web3.utils.soliditySha3(message8), "0x" + private_key8.toString('hex')).signature, { from: accounts[8] });
        await IdenaEthRelayInstance.relayState(message9, web3.eth.accounts.sign(web3.utils.soliditySha3(message9), "0x" + private_key9.toString('hex')).signature, { from: accounts[9] });
        for (let i in identities00) {
            ((await IdenaEthRelayInstance.identities("1", accounts[identities00[i]]))[0]).should.be.equal(true);
        }
    });
});
