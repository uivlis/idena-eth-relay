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

    constructor (bytes memory _identities) public {
        for (uint256 i = 0; i < _identities.length; i += 20) {
            identities[0][address(_identities.toAddress(i))] = IDetails(
                true,
                false,
                0
                );
            identitiesCount[0]++;
        }
    }

    function relay(bytes memory _identities, bytes memory signature) public {
        address signer = keccak256(abi.encodePacked(_identities))
            .toEthSignedMessageHash().recover(signature);
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