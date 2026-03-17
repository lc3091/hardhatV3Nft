// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./MetaNFTAuctionUUPS.sol";

contract MetaNFTAuctionUUPS_V2 is MetaNFTAuctionUUPS {
    function getVersion() external pure override returns (string memory) {
        return "MetaNFTAuctionUUPS V2";
    }

    function newFeature() external pure returns (string memory) {
        return "This is a new feature in UUPS V2";
    }
}
