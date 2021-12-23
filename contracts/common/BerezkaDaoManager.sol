// SPDX-License-Identifier: Unlicense
// Developed by EasyChain Blockchain Development Team (easychain.tech)
//
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";

contract BerezkaDaoManager is Ownable {
    // Information about DAO
    struct Dao {
        address agent; // Address of Aragon DAO Agent App
        address tokens; // Address of Aragon DAO Tokens App
    }

    // Each token have an agent to withdraw tokens from
    //
    mapping(address => Dao) public daoConfig;

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
}
