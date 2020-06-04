pragma solidity ^0.6.8;

import "./BytesLib.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/cryptography/ECDSA.sol";


contract IdenaEthRelay {

    using BytesLib for bytes;
    using SafeMath for uint256;
    using ECDSA for bytes32;

    uint256 epoch;
    mapping(uint256 => bytes32) roots;
    mapping(uint256 => uint256) identitiesCount;
    mapping(uint256 => mapping(address => bool)) public isIdentity;

    constructor (bytes memory _state) public {
        bytes32 root;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            root := mload(add(_state, 32))
        }
        roots[0] = root;
        for (uint256 i = 32; i < _state.length; i += 20) {
            isIdentity[0][address(_state.toAddress(i))] = true;
            identitiesCount[0]++;
        }
    }

    function relayKillInvitee(
        uint32 accountNonce,
        uint16 epoch,
        uint16 txType,
        address to,
        uint256 amount,
        uint256 maxFee,
        uint256 tips,
        bytes memory payload,
        bytes memory signature,
        address killerIdentity,
        bytes32[] memory proof
    ) public {
        require(
            txType == 10,
            "Transaction type must be 'KillInviteeTx'(0xA)"
        );
        address signer = keccak256(
            abi.encodePacked(
                accountNonce,
                epoch,
                txType,
                to,
                amount,
                maxFee,
                tips,
                payload
            )
        ).toEthSignedMessageHash().recover(signature);
        require(
            signer == killerIdentity,
            "Recovered signer did not match killer identity."
        );
        require(
            verify(roots[epoch], keccak256(abi.encodePacked(killerIdentity)), proof),
            "Could not prove invitee status of killed identity."
        );
        require (
            isIdentity[epoch][to],
            "Killed identity is not valid."
        );
        delete isIdentity[epoch][to];
        identitiesCount[epoch]--;
    }

    function relayKill(
        uint32 accountNonce,
        uint16 epoch,
        uint16 txType,
        address to,
        uint256 amount,
        uint256 maxFee,
        uint256 tips,
        bytes memory payload,
        bytes memory signature,
        address killedIdentity
    ) public {
        require(
            txType == 3,
            "Transaction type must be 'KillTx'(0x3)"
        );
        address signer = keccak256(
            abi.encodePacked(
                accountNonce,
                epoch,
                txType,
                to,
                amount,
                maxFee,
                tips,
                payload
            )
        ).toEthSignedMessageHash().recover(signature);
        require(
            signer == killedIdentity,
            "Recovered signer did not match killed identity."
        );
        require (
            isIdentity[epoch][signer],
            "Killed identity is not valid."
        );
        delete isIdentity[epoch][signer];
        identitiesCount[epoch]--;
    }

    function relayState(bytes memory _state, bytes memory signatures) public {
        uint256 validSigs = 0;
        uint256 threshold = (identitiesCount[epoch].mul(2) + 1).div(3);
        for (uint i = 0; i < signatures.length; i += 65) {
            address signer = keccak256(abi.encodePacked(_state))
                .toEthSignedMessageHash()
                .recover(signatures.slice(i, 65));
            if (isIdentity[epoch][signer]) {
                validSigs++;
            }
        }
        require (
            validSigs >= threshold,
            "Not enough valid signatures to relay new state."
        );
        bytes32 root;
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            root := mload(add(_state, 32))
        }
        roots[++epoch] = root;
        for (uint256 i = 32; i < _state.length; i += 20) {
            isIdentity[epoch][address(_state.toAddress(i))] = true;
            identitiesCount[epoch]++;
        }
    }

    function verify(
        bytes32 _root,
        bytes32 _leaf,
        bytes32[] memory _proof
    )
    internal
    pure
    returns (bool)
    {
        bytes32 computedHash = _leaf;

        for (uint256 i = 0; i < _proof.length; i++) {
            bytes32 proofElement = _proof[i];
            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        return computedHash == _root;
    }

}