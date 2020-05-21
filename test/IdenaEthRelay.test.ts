import { should } from 'chai';
import { IdenaEthRelayInstance } from '../types/truffle-contracts';

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
     * @test {IdenaEthRelay#relay}
     */
    it('...should relay identities succesfully', async () => {
        // console.log(await IdenaEthRelayInstance.relay.estimateGas("0x" + accounts.map((account, i) => i in identities7 ? account.slice(2) : "").join(""), { from: accounts[7], gasPrice: 0 }));
        await IdenaEthRelayInstance.relay("0x" + accounts.map((account, i) => identities2.includes(i) ? account.slice(2) : "").join(""), { from: accounts[2] });
        await IdenaEthRelayInstance.relay("0x" + accounts.map((account, i) => identities5.includes(i) ? account.slice(2) : "").join(""), { from: accounts[5] });
        await IdenaEthRelayInstance.relay("0x" + accounts.map((account, i) => identities7.includes(i) ? account.slice(2) : "").join(""), { from: accounts[7] });
        await IdenaEthRelayInstance.relay("0x" + accounts.map((account, i) => identities8.includes(i) ? account.slice(2) : "").join(""), { from: accounts[8] });
        await IdenaEthRelayInstance.relay("0x" + accounts.map((account, i) => identities9.includes(i) ? account.slice(2) : "").join(""), { from: accounts[9] });
        for (let i in identities00) {
            ((await IdenaEthRelayInstance.identities("1", accounts[identities00[i]]))[0]).should.be.equal(true);
        }
    });
});
