// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract MockOracle {
    int256 private price;

    constructor(int256 initialPrice) {
        price = initialPrice;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (uint80(1), price, block.timestamp, block.timestamp, uint80(1));
    }

    function setPrice(int256 newPrice) external {
        price = newPrice;
    }

    function getPrice() external view returns (int256) {
        return price;
    }
}
