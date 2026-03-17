// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./MetaNFTAuction.sol";

contract MetaNFTAuctionV2 is MetaNFTAuction {
    function getVersion() external pure override returns (string memory) {
        return "MetaNFTAuctionV2";
    }

    function newFeature() external pure returns (string memory) {
        return "This is a new feature in V2";
    }
}
