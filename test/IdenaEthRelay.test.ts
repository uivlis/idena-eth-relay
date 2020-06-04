import path = require('path');
import { should } from 'chai';
import * as bip39 from 'bip39';
const {
    BN,           // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
  } = require('@openzeppelin/test-helpers');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256')
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
    const identities00 = [5, 6, 7, 8, 9, 11];

    const leaves0 = [5, 2, -1, 5, -1, 6, -1, 7, 7, 8, 6, 9];
    const hashedLeaves0 = leaves0.map((leaf, i) => leaf == -1 ? "0x0" : accounts[leaf]).map(leaf => keccak256(leaf));
    const tree0 = new MerkleTree(hashedLeaves0, keccak256, { sort: true });
    const state0 = tree0.getHexRoot() + identities0.map((identity) => accounts[identity].slice(2)).join("");

    const leaves00 = [-1, 5, -1, 6, -1, 7, -1, 8, 6, 9, 7, 11];
    const hashedLeaves00 = leaves00.map((leaf, i) => leaf == -1 ? "0x0" : accounts[leaf]).map(leaf => keccak256(leaf));
    const tree00 = new MerkleTree(hashedLeaves00, keccak256, { sort: true });
    const state00 = tree00.getHexRoot() + identities00.map((identity) => accounts[identity].slice(2)).join("");
    
    beforeEach(async () => {  
        IdenaEthRelayInstance = await IdenaEthRelay.new(state0);
    });

    /**
     * Test the constructor
     * @test {IdenaEthRelay#}
     */
    it('...should be deployed succesfully', async () => {
        // check identities
        for (let i in identities0) {
            ((await IdenaEthRelayInstance.isIdentity("0", accounts[identities0[i]]))).should.be.equal(true);
        }
    });

    /**
     * Test the validation of identitites
     * @test {IdenaEthRelay#relayState}
     */
    it('...should relay identities succesfully', async () => {

        const seed = await bip39.mnemonicToSeed(process.env.GANACHE_MNEMONIC ? process.env.GANACHE_MNEMONIC : "");
        const hdk = hdkey.fromMasterSeed(seed);

        const signers = [5, 7, 8, 9];
        //m/44'/60'/0'/0/0 is derivation path for the first account. m/44'/60'/0'/0/1 is the derivation path for the second account and so on
        const pks = signers.map(signer => hdk.derivePath("m/44'/60'/0'/0/" + signer).getWallet().getPrivateKey());

        await IdenaEthRelayInstance.relayState(state00, "0x" + pks.map(pk => web3.eth.accounts.sign(web3.utils.soliditySha3(state00), "0x" + pk.toString('hex')).signature.slice(2)).join(""), { from: accounts[1] });

        // check new identities
        for (let i in identities00) {
            ((await IdenaEthRelayInstance.isIdentity("1", accounts[identities00[i]]))).should.be.equal(true);
        }
    });

    /**
     * Test the killing of identitites
     * @test {IdenaEthRelay#relayKill}
     */
    it('...should relay kills succesfully', async () => {

        const seed = await bip39.mnemonicToSeed(process.env.GANACHE_MNEMONIC ? process.env.GANACHE_MNEMONIC : "");
        const hdk = hdkey.fromMasterSeed(seed);

        const suicider = 5;

        const pk =  hdk.derivePath("m/44'/60'/0'/0/" + suicider).getWallet().getPrivateKey();
        const tx = [
            { type: "uint32", value: "0" }, // accountNonce
            { type: "uint16", value: "0" }, // epoch
            { type: "uint16", value: "3" }, // txType (KillTx)
		    { type: "address", value: accounts[suicider] }, // to
            { type: "uint256", value: "0" }, // amount
            { type: "uint256", value: "0" }, // maxFee
            { type: "uint256", value: "0" }, // tips
            { type: "bytes", value: web3.utils.utf8ToHex("0") }, //payload
        ];

        // check identity before killing
        ((await IdenaEthRelayInstance.isIdentity("0", accounts[suicider]))).should.be.equal(true);

        await IdenaEthRelayInstance.relayKill(
            tx[0].value,
            tx[1].value,
            tx[2].value,
            tx[3].value,
            tx[4].value,
            tx[5].value,
            tx[6].value,
            tx[7].value,
            web3.eth.accounts.sign(web3.utils.soliditySha3(...tx), "0x" + pk.toString('hex')).signature,
            accounts[suicider],
            { from: accounts[1] }
        );

        // check killed identity
        ((await IdenaEthRelayInstance.isIdentity("0", accounts[suicider]))).should.be.equal(false);
    });

    /**
     * Test the killing of invitees
     * @test {IdenaEthRelay#relayKillInvitee}
     */
    it('...should relay invitee kills succesfully', async () => {

        const seed = await bip39.mnemonicToSeed(process.env.GANACHE_MNEMONIC ? process.env.GANACHE_MNEMONIC : "");
        const hdk = hdkey.fromMasterSeed(seed);

        const killer = 5;
        const killed = 2;

        const pk =  hdk.derivePath("m/44'/60'/0'/0/" + killer).getWallet().getPrivateKey();
        const tx = [
            { type: "uint32", value: "0" }, // accountNonce
            { type: "uint16", value: "0" }, // epoch
            { type: "uint16", value: "10" }, // txType (KillTx)
		    { type: "address", value: accounts[killed] }, // to
            { type: "uint256", value: "0" }, // amount
            { type: "uint256", value: "0" }, // maxFee
            { type: "uint256", value: "0" }, // tips
            { type: "bytes", value: web3.utils.utf8ToHex("0") }, //payload
        ];

        // check identity before killing
        ((await IdenaEthRelayInstance.isIdentity("0", accounts[killed]))).should.be.equal(true);

        await IdenaEthRelayInstance.relayKillInvitee(
            tx[0].value,
            tx[1].value,
            tx[2].value,
            tx[3].value,
            tx[4].value,
            tx[5].value,
            tx[6].value,
            tx[7].value,
            web3.eth.accounts.sign(web3.utils.soliditySha3(...tx), "0x" + pk.toString('hex')).signature,
            accounts[killer],
            tree0.getHexProof(keccak256(accounts[killer])),
            { from: accounts[1] }
        );

        // check killed identity
        ((await IdenaEthRelayInstance.isIdentity("0", accounts[killed]))).should.be.equal(false);
    });
});
