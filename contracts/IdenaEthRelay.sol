pragma solidity ^0.6.8;

import "./BytesLib.sol";
import "@hq20/contracts/contracts/state/StateMachine.sol";
import "@hq20/contracts/contracts/lists/LinkedList.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/cryptography/ECDSA.sol";


contract IdenaEthRelay is Ownable, StateMachine {

    using BytesLib for bytes;
    using SafeMath for uint256;
    using ECDSA for bytes32;

    uint256 epoch;
    mapping(uint256 => bytes32) roots;
    mapping(uint256 => bytes) states;
    mapping(uint256 => uint256) identitiesCount;
    mapping(uint256 => mapping(address => bool)) public isIdentity;
    LinkedList internal tempIsIdentity;
    bytes32 internal tempRoot;
    bytes internal tempState;
    uint256 internal tempThreshold;
    uint256 internal tempValidSigs;

    constructor (bytes32 _root) public {
        roots[0] = _root;
        _createTransition("SETUP", "RELAYED");
        _createTransition("RELAYED", "RELAYING_STATE");
        _createTransition("RELAYING_STATE", "RELAYING_SIGS");
        _createTransition("RELAYING_SIGS", "RELAYED");
    }

    function initState(bytes memory _state) public onlyOwner {
        require(currentState == "SETUP", "Cannot initiliaze state now.");
        for (uint256 i = 0; i < _state.length; i += 20) {
            isIdentity[0][address(_state.toAddress(i))] = true;
            identitiesCount[0]++;
        }
        states[0].concatStorage(_state);
    }

    function finishInit() public onlyOwner {
        _transition("RELAYED");
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
        require(currentState == "RELAYED", "Cannot relay kill now.");
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
        bytes memory newState;
        bytes memory currState = states[epoch];
        for (uint256 i = 0; i < currState.length; i += 20) {
            if (address(currState.toAddress(i)) != to) {
                newState = newState.concat(currState.slice(i, 20));
            }
        }
        states[epoch] = newState;
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
        require(currentState == "RELAYED", "Cannot relay kill now.");
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
        bytes memory newState;
        bytes memory currState = states[epoch];
        for (uint256 i = 0; i < currState.length; i += 20) {
            if (address(currState.toAddress(i)) != signer) {
                newState = newState.concat(currState.slice(i, 20));
            }
        }
        states[epoch] = newState;
        delete isIdentity[epoch][signer];
        identitiesCount[epoch]--;
    }

    function initRelay(bytes32 _root) public onlyOwner {
        require(currentState == "RELAYED", "Cannot initialize relaying now.");
        tempIsIdentity = new LinkedList();
        tempRoot = _root;
        _transition("RELAYING_STATE");
    }

    function relayState(bytes memory _state) public onlyOwner {
        require(currentState == "RELAYING_STATE", "Cannot relay state now.");
        for (uint256 i = 0; i < _state.length; i += 20) {
            tempIsIdentity.addTail(address(_state.toAddress(i)));
        }
        tempState.concatStorage(_state);
    }

    function finishState() public onlyOwner {
        require(currentState == "RELAYING_STATE", "Cannot finish state now.");
        tempThreshold = ((tempIsIdentity.idCounter() - 1).mul(2) + 1).div(3);
        _transition("RELAYING_SIGS");
    }

    function relaySignatures(bytes memory _signatures) public onlyOwner {
        require(
            currentState == "RELAYING_SIGS",
            "Cannot relay signatures now."
        );
        for (uint i = 0; i < _signatures.length; i += 65) {
            address signer = keccak256(
                abi.encodePacked(abi.encodePacked(tempRoot).concat(tempState))
                ).toEthSignedMessageHash()
                .recover(_signatures.slice(i, 65));
            if (isIdentity[epoch][signer]) {
                tempValidSigs++;
            }
        }
    }

    function finishSignatures() public onlyOwner {
        require(currentState == "RELAYING_SIGS", "Cannot finish sigs now.");
        require (
            tempValidSigs >= tempThreshold,
            "Not enough valid signatures to relay new state."
        );
        epoch++;
        states[epoch] = tempState;
        roots[epoch] = tempRoot;
        for (uint256 i = 0; i < tempIsIdentity.idCounter(); i++) {
            (,,address id) = tempIsIdentity.get(i);
            isIdentity[epoch][id] = true;
            identitiesCount[epoch]++;
        }
        delete tempRoot;
        delete tempState;
        delete tempThreshold;
        delete tempValidSigs;
        _transition("RELAYED");
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