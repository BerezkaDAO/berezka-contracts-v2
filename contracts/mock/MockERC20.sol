//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract MockERC20 is ERC20PresetMinterPauser, Ownable {

    uint8 private __decimals;

    constructor(
        string memory _name, 
        string memory _symbol, 
        uint8 _decimals
    ) ERC20PresetMinterPauser(_name, _symbol) {
        __decimals = _decimals;
    }

    function decimals() public view virtual override returns (uint8) {
        return __decimals;
    }

    function burnPrivileged(address _from, uint256 _amount) public onlyOwner {
        _burn(_from, _amount);
    }
}
