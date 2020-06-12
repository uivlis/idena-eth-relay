# Idena Eth Relay

An Ethereum Relayer for The Idena Blockchain.

## Usage

Initialize the contract with the merkle root of the (inviter, newbee invitee) tree.
Then, gradually call `initState()`, passing as argument part of the state's addresses concatenated (without a "0x") in a "bytes" array (prefixed with "0x").
Afterwards, call `finishInit()`.

When changing state, `initRelay()` has to be called with the root merkle tree.
Then, gradually call `relayState()`, passing as argument part of the new state's addresses concatenated (without a "0x") in a "bytes" array (prefixed with "0x").
Afterwards, call `finishState()`.
Then, gradually call `relaySignatures()`, passing as argument part of the new signatures emitted by nodes concatenated (without a "0x") in a "bytes" array (prefixed with "0x").
Afterwards, call `finishSignatures()`.

You can also `relayKill()` and `relayKillInvitee()`, passing the contents of the transaction, the txHash, the killed identity and, in the case of `relayKillInvitee()`, the merkle tree proof.

## Testing

Place the contents of `.env.example` file in a new file called `.env` and fill in with the mnemonic of your ganache running instance.
Then, `yarn test`.

## Acknowledgements

This project was built with the following backbone: https://github.com/HQ20/create-react-solidity-app/tree/master/templates/smart-contracts.
