// SPDX-License-Identifier: Unlicense
// Developed by EasyChain Blockchain Development Team (easychain.tech)
//
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./IAgent.sol";
import "./ITokens.sol";

// This contract provides Withdraw function for Berezka DAO
// Basic flow is:
//  1. User obtains signed price data from trusted off-chain Oracle
//  2. Exchange rate is computed
//  3. User's tokens are burned (no approval need thanks to Aragon)
//  4. Stable coins are transferred to user
//
contract BerezkaWithdraw is Ownable {
    // Events
    event WithdrawSuccessEvent(
        address indexed daoToken,
        uint256         daoTokenAmount,
        address indexed stableToken,
        uint256         stableTokenAmount,
        address indexed sender,
        uint256         price,
        uint256         timestamp
    );

    // Information about DAO
    struct Dao {
        address agent; // Address of Aragon DAO Agent App
        address tokens; // Address of Aragon DAO Tokens App
    }

    // Token whitelist to withdraw
    //
    mapping(address => bool) public whitelist;

    // Each token have an agent to withdraw tokens from
    //
    mapping(address => Dao) public daoConfig;

    // Address of Oracle
    //
    address public oracleAddress = 0xAb66dE3DF08318922bb4cE15553E4C2dCf9187A1;

    // Signature expiration time
    //
    uint256 public signatureValidityDuractionSec = 3600;

    // Main function. Allows user (msg.sender) to withdraw funds from DAO.
    // _amount - amount of DAO tokens to exhange
    // _token - token of DAO to exchange
    // _targetToken - token to receive in exchange
    // _optimisticPrice - an optimistic price of DAO token. Used to check if DAO Agent
    //                    have enough funds on it's balance. Is not used to calculare
    //                    use returns
    function withdraw(
        uint256 _amount,
        address _token,
        address _targetToken,
        uint256 _optimisticPrice,
        uint256 _optimisticPriceTimestamp,
        bytes memory _signature
    ) public {
        // Require that amount is positive
        //
        require(_amount > 0, "ZERO_TOKEN_AMOUNT");
        // Require that an optimistic price is set
        //
        require(_optimisticPrice > 0, "ZERO_OPTIMISTIC_PRICE");

        // Check that token to withdraw is whitelisted
        //
        require(whitelist[_targetToken], "INVALID_TOKEN_TO_WITHDRAW");

        // Check DAO token balance on iuser
        //
        IERC20 token = IERC20(_token);
        require(
            token.balanceOf(msg.sender) >= _amount,
            "NOT_ENOUGH_TOKENS_TO_BURN_ON_BALANCE"
        );

        // Require that there is an agent (vault) address for a given token
        //
        address agentAddress = daoConfig[_token].agent;
        require(agentAddress != address(0), "NO_DAO_FOR_TOKEN");

        // Check that signature is not expired and is valid
        //
        require(
            isValidSignatureDate(_optimisticPriceTimestamp),
            "EXPIRED_PRICE_DATA"
        );

        require(
            isValidSignature(
                _optimisticPrice,
                _optimisticPriceTimestamp,
                _token,
                _signature
            ),
            "INVALID_SIGNATURE"
        );

        // Require that an agent have funds to fullfill request (optimisitcally)
        // And that this contract can withdraw neccesary amount of funds from agent
        //
        IERC20 targetToken = IERC20(_targetToken);
        uint256 optimisticAmount = computeExchange(
            _amount,
            _optimisticPrice,
            _targetToken
        );
        require(optimisticAmount > 0, "INVALID_TOKEN_AMOUNT");
        require(
            targetToken.balanceOf(agentAddress) >= optimisticAmount,
            "INSUFFICIENT_FUNDS_ON_AGENT"
        );

        // Perform actual exchange
        //
        IAgent agent = IAgent(agentAddress);
        agent.transfer(_targetToken, msg.sender, optimisticAmount);

        // Burn tokens
        //
        ITokens tokens = ITokens(daoConfig[_token].tokens);
        tokens.burn(msg.sender, _amount);

        // Emit withdraw success event
        //
        emit WithdrawSuccessEvent(
            _token,
            _amount,
            _targetToken,
            optimisticAmount,
            msg.sender,
            _optimisticPrice,
            _optimisticPriceTimestamp
        );
    }

    function isValidSignatureDate(
        uint256 _optimisticPriceTimestamp
    ) public view returns (bool) {
        uint256 timeDelta = 0;
        if (_optimisticPriceTimestamp >= block.timestamp) {
            timeDelta = _optimisticPriceTimestamp - block.timestamp;
        } else {
            timeDelta = block.timestamp - _optimisticPriceTimestamp;
        }
        return timeDelta <= signatureValidityDuractionSec;
    }

    // Validates oracle price signature
    //
    function isValidSignature(
        uint256 _price,
        uint256 _timestamp,
        address _token,
        bytes memory _signature
    ) public view returns (bool) {
        return recover(_price, _timestamp, _token, _signature) == oracleAddress;
    }

    // Validates oracle price signature
    //
    function recover(
        uint256 _price,
        uint256 _timestamp,
        address _token,
        bytes memory _signature
    ) public pure returns (address) {
        bytes32 dataHash = keccak256(abi.encodePacked(_price, _timestamp, _token));
        bytes32 signedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash)
        );
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);
        address signer = ecrecover(signedMessageHash, v, r, s);
        return signer;
    }

    function splitSignature(bytes memory sig)
        public
        pure
        returns (
            bytes32 r,
            bytes32 s,
            uint8 v
        )
    {
        require(sig.length == 65, "invalid signature length");

        assembly {
            /*
            First 32 bytes stores the length of the signature

            add(sig, 32) = pointer of sig + 32
            effectively, skips first 32 bytes of signature

            mload(p) loads next 32 bytes starting at the memory address p into memory
            */

            // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // second 32 bytes
            s := mload(add(sig, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        // implicitly return (r, s, v)
    }

    // Computes an amount of _targetToken that user will get in exchange for
    // a given amount for DAO tokens
    // _amount - amount of DAO tokens
    // _price - price in 6 decimals per 10e18 of DAO token
    // _targetToken - target token to receive
    //
    function computeExchange(
        uint256 _amount,
        uint256 _price,
        address _targetToken
    ) public view returns (uint256) {
        IERC20Metadata targetToken = IERC20Metadata(_targetToken);
        return _amount * _price / 10 ** (24 - targetToken.decimals());
    }

    // --- Administrative functions ---

    // Adds new DAO to contract.
    // _token - DAO token
    // _tokens - corresponding Tokens service in Aragon, that manages _token
    // _agent - agent contract in Aragon (fund holder)
    //
    function addDao(
        address _token,
        address _tokens,
        address _agent
    ) public onlyOwner {
        require(_token != address(0), "INVALID_TOKEN_ADDRESS");
        require(_agent != address(0), "INVALID_TOKEN_ADDRESS");
        require(_tokens != address(0), "INVALID_TOKENS_ADDRESS");

        daoConfig[_token] = Dao(_agent, _tokens);
    }

    // Removes DAO from contract
    // _token - token to remove
    //
    function deleteDao(address _token) public onlyOwner {
        require(_token != address(0), "INVALID_TOKEN_ADDRESS");
        delete daoConfig[_token];
    }

    // Sets an address of Oracle
    // _oracleAddres - Oracle
    //
    function setOracleAddress(address _oracleAddres) public onlyOwner {
        oracleAddress = _oracleAddres;
    }

    // Adds possible tokens (stableconins) to withdraw to
    // _whitelisted - list of stableconins to withdraw to
    //
    function addWhitelistTokens(address[] memory _whitelisted)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < _whitelisted.length; i++) {
            whitelist[_whitelisted[i]] = true;
        }
    }

    // Removes possible tokens (stableconins) to withdraw to
    // _whitelisted - list of stableconins to withdraw to
    //
    function removeWhitelistTokens(address[] memory _whitelisted)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < _whitelisted.length; i++) {
            whitelist[_whitelisted[i]] = false;
        }
    }

    // Adds possible tokens (stableconins) to withdraw to
    // _whitelisted - list of stableconins to withdraw to
    //
    function setSignatureValidityDurationSec(
        uint256 _signatureValidityDuractionSec
    ) public onlyOwner {
        require(_signatureValidityDuractionSec > 0);

        signatureValidityDuractionSec = _signatureValidityDuractionSec;
    }
}
