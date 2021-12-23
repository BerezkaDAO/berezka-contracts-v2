//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "../api/ITokens.sol";
import "./MockERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockTokens is ITokens, Ownable {

    MockERC20 public daoToken;

    constructor(string memory name) {
        MockERC20 token = new MockERC20(name, name, 18);
        daoToken = token;
    }

    function burn(address _holder, uint256 _amount) override external {
        daoToken.burnPrivileged(_holder, _amount);
    }

    function mint(address _to, uint256 _amount) override external onlyOwner {
        daoToken.mint(_to, _amount);
    }
}