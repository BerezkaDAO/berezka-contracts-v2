//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "../IAgent.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract MockAgent is IAgent {

    function transfer(
        address _token,
        address _to,
        uint256 _value
    ) external override {
        ERC20Burnable token = ERC20Burnable(_token);
        token.transfer(_to, _value);
    }
}
