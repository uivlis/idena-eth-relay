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

    let idenaEthRelayInstance: IdenaEthRelayInstance;
    const bigTestBatches = 10;
    const bigTestBatchSize = 100;
    const addressCount = bigTestBatches * bigTestBatchSize;
    const identities0 = [2, 5, 6, 7, 8, 9];
    const identities00 = [5, 6, 7, 8, 9, 11];

    const leaves0 = [5, 2, 7, 8, 6, 9]; // 5 is the inviter of newbie 2; 7 is the inviter of newbie 8; 6 is the inviter of newbie 9.
    const hashedLeaves0 = leaves0.map(leaf => keccak256(accounts[leaf]));
    const tree0 = new MerkleTree(hashedLeaves0, keccak256, { sort: true });
    const root0 = tree0.getHexRoot();
    const state0 = "0x" + identities0.map((identity) => accounts[identity].slice(2)).join("");

    const leaves00 = [6, 9, 7, 11];
    const hashedLeaves00 = leaves00.map(leaf => keccak256(accounts[leaf]));
    const tree00 = new MerkleTree(hashedLeaves00, keccak256, { sort: true });
    const root00 = tree00.getHexRoot();
    const state00 = "0x" + identities00.map(identity => accounts[identity].slice(2)).join("");

    describe('...when used with 1000 adresses', () => {

        /**
         * Test the gas cost of relay
         * @test {IdenaEthRelay#relayState}
         */
        it('...should relay identities with very little gas', async () => {

            const seed = await bip39.mnemonicToSeed(process.env.GANACHE_MNEMONIC ? process.env.GANACHE_MNEMONIC : "");
            const hdk = hdkey.fromMasterSeed(seed);

            const bigIdentities0 = [...Array(addressCount).keys()]
            const bigLeaves0 = [...Array(addressCount).keys()]
            const bigAccounts = bigIdentities0.map(bigIdentity => hdk.derivePath("m/44'/60'/0'/0/" + bigIdentity).getWallet().getAddressString());
            const bigHashedLeaves0 = bigLeaves0.map(leaf => keccak256(bigAccounts[leaf]));
            const bigTree0 = new MerkleTree(bigHashedLeaves0, keccak256, { sort: true });
            const bigRoot0 = bigTree0.getHexRoot();

            idenaEthRelayInstance = await IdenaEthRelay.new(bigRoot0);
            for (let i = 0; i < addressCount; i += bigTestBatchSize) {
                await idenaEthRelayInstance.initState("0x" + bigIdentities0.map((bigIdentity, index) => index >= i && index < i + bigTestBatchSize ? bigAccounts[bigIdentity].slice(2) : "").join(""));
            }
            await idenaEthRelayInstance.finishInit();

            // check random identity;
            const randId = Math.floor(Math.random() * bigTestBatchSize * bigTestBatches);
            ((await idenaEthRelayInstance.isIdentity("0", bigAccounts[bigIdentities0[randId]]))).should.be.equal(true);
        });

        describe('...when testing with a smaller set', () => {

            beforeEach(async () => {  
                idenaEthRelayInstance = await IdenaEthRelay.new(root0);
            });
        
            /**
             * Test the constructor
             * @test {IdenaEthRelay#}
             */
            it('...should init identities succesfully', async () => {
                await idenaEthRelayInstance.initState(state0);
                await idenaEthRelayInstance.finishInit();
                // check identities
                for (let i in identities0) {
                    ((await idenaEthRelayInstance.isIdentity("0", accounts[identities0[i]]))).should.be.equal(true);
                }
            });

            describe('...when testing with a smaller set, after initialization', () => {

                beforeEach(async () => {  
                    await idenaEthRelayInstance.initState(state0);
                    await idenaEthRelayInstance.finishInit();
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

                    const toBeSigned = root00 + state00.slice(2);

                    await idenaEthRelayInstance.initRelay(root00);
                    await idenaEthRelayInstance.relayState(state00);
                    await idenaEthRelayInstance.finishState();
                    await idenaEthRelayInstance.relaySignatures("0x" + pks.map(pk => web3.eth.accounts.sign(web3.utils.soliditySha3(toBeSigned), "0x" + pk.toString('hex')).signature.slice(2)).join(""));
                    await idenaEthRelayInstance.finishSignatures();

                    // check new identities
                    for (let i in identities00) {
                        (await idenaEthRelayInstance.isIdentity("1", accounts[identities00[i]])).should.be.equal(true);
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
                    ((await idenaEthRelayInstance.isIdentity("0", accounts[suicider]))).should.be.equal(true);
            
                    await idenaEthRelayInstance.relayKill(
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
                    ((await idenaEthRelayInstance.isIdentity("0", accounts[suicider]))).should.be.equal(false);
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
                    ((await idenaEthRelayInstance.isIdentity("0", accounts[killed]))).should.be.equal(true);
            
                    await idenaEthRelayInstance.relayKillInvitee(
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
                    ((await idenaEthRelayInstance.isIdentity("0", accounts[killed]))).should.be.equal(false);
                });
            })
        })
    })
});
