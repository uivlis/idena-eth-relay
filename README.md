# Idena Eth Relay

An Ethereum Relayer for The Idena Blockchain.

## Usage

The contract can be deployed by passing to the constructor the current state of the Idena blockchain, at the time of construction.

By the "current state" it is meant the root of the sorted merkle tree of the type `(inviter address, invitee address)` (where invitee is 'Newbie'), prepended to all the valid identities, concatenated in a `bytes` type variable, one after the other and without the `0x` part (except at the beginning).

For example, if the Idena state at the time of validation is:

```
address1: 0xA6B55B19e4ecFcBA9652Ad3584Af687010dBa769
address2: 0xCD2E2DA435356Ba287Ab01899df9137E81236f52
address3: 0x3ed699e5Cc01B3Db450bCb3Fc98dF5897B2cCE7f
```
Then, you would call in `web3`:
```
...
await IdenaEthRelay.new('0x{root_the_sorted_merkle_tree_of_all_inviters}A6B55B19e4ecFcBA9652Ad3584Af687010dBa769CD2E2DA435356Ba287Ab01899df9137E81236f523ed699e5Cc01B3Db450bCb3Fc98dF5897B2cCE7f');
...
```
The `_state_` parameter does not have to contain checksummed addresses.

To relay a change, pass to the `relayState` function the new state of the Idena blockchain and the signatures produced by signing that state with Idena addresses. If the state gets more than `2/3` valid signatures from the total valid identities in the previous epoch, it will appear as valid in the new epoch.

To relay a chnage made through a `KillTx`, pass to the `relayKill` function the parameters of the Tx, the txHash and the killed identity address.

To relay a chnage made through a `KillTxInvitee`, pass to the `relayKillInvitee` function the parameters of the Tx, the txHash, the killer identity address and the Merkle proof.

To check whether an address has lately been validated on the Idena blokchain do:
```
...
assert((await IdenaEthRelay.isIdentity.call(await IdenaEthRelay.epoch(), <YOUR_ADDRESS>)));
...
```

## Testing

Place the contents of `.env.example` file in a new file called `.env` and fill in with the mnemonic of your ganache running instance.
Then, `yarn test`.

## Acknowledgements

This project was built with the following backbone: https://github.com/HQ20/create-react-solidity-app/tree/master/templates/smart-contracts.
