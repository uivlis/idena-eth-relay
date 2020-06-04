pragma solidity ^0.6.8;

import "./BytesLib.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/cryptography/ECDSA.sol";

contract IdenaEthRelay {

    using BytesLib for bytes;
    using SafeMath for uint256;
    using ECDSA for bytes32;

    struct IDetails {
        bool valid;
        bool voted;
        uint256 signatures;
    }

    uint256 epoch;
    mapping(uint256 => uint256) identitiesCount;
    mapping(uint256 => mapping(address => IDetails)) public identities;
    mapping(uint256 => bytes32) roots;

    constructor (bytes memory _identities, bytes32 _root) public {
        for (uint256 i = 0; i < _identities.length; i += 20) {
            identities[0][address(_identities.toAddress(i))] = IDetails(true, false, 0);
            identitiesCount[0]++;
        }
        roots[0] = _root;
    }

    function verify(
        bytes32 root,
        bytes32 leaf,
        bytes32[] memory proof
    )
    public
    pure
    returns (bool)
    {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }
        return computedHash == root;
    }

    function relayKillInvitee(
        uint32 accountNonce,
        uint16 epoch,
        uint16 txType,
        address to,
        uint256 amount,
        uint256 maxFee,
        uint256 tips,
        bytes payload,
        bytes signature,
        address killerIdentity
    ) public {

    }

    function relayKill(
        uint32 accountNonce,
        uint16 epoch,
        uint16 txType,
        address to,
        uint256 amount,
        uint256 maxFee,
        uint256 tips,
        bytes payload,
        bytes signature,
        address killedIdentity
    ) public {
        require(txType == 3, 'Transaction type must be "KillTx"(0x3)');
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
            ).recover(signature);
        require(signer == killedIdentity, "Recovered signer did not match killed identity.");
        delete identities[epoch][signer];
        identitiesCount[epoch]--;
    }

    function relayState(bytes memory _identities, bytes memory signature) public {
        address signer = keccak256(abi.encodePacked(_identities)).toEthSignedMessageHash().recover(signature);
        uint256 e = epoch + 1;
        while (e > 0 && !identities[e][signer].valid) {
            e--;
        }
        require(
            identities[e][signer].valid && !identities[e][signer].voted,
            "Cannot vote in any epoch."
        );
        identities[e + 1][signer].voted = true;
        uint256 threshold = (identitiesCount[e].mul(2) + 1).div(3);
        address identity;
        for (uint256 i = 0; i < _identities.length; i += 20) {
            identity = address(_identities.toAddress(i));
            identities[e + 1][identity].signatures++;
            if (identities[e + 1][identity].signatures == threshold) {
                identities[e + 1][identity].valid = true;
                identitiesCount[e + 1]++;
                epoch++;
            }
        }
    }

}