// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LXUSD
 * @dev ERC-20 token contract for LXUSD on XRPL EVM Testnet
 * @notice This contract implements a standard ERC-20 token with minting capabilities
 */
contract LXUSD {
    // Token metadata
    string public name = "LXUSD";
    string public symbol = "LXUSD";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    // Owner of the contract (can mint tokens)
    address public owner;

    // Balances mapping
    mapping(address => uint256) public balanceOf;

    // Allowances mapping
    mapping(address => mapping(address => uint256)) public allowance;

    // Events
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);

    /**
     * @dev Constructor sets the contract owner
     */
    constructor() {
        owner = msg.sender;
        totalSupply = 0;
    }

    /**
     * @dev Modifier to restrict functions to owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Transfer tokens from caller to recipient
     * @param to Address to transfer tokens to
     * @param value Amount of tokens to transfer
     * @return success Boolean indicating if transfer was successful
     */
    function transfer(address to, uint256 value) public returns (bool success) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        require(to != address(0), "Cannot transfer to zero address");

        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;

        emit Transfer(msg.sender, to, value);
        return true;
    }

    /**
     * @dev Transfer tokens from one address to another (requires approval)
     * @param from Address to transfer tokens from
     * @param to Address to transfer tokens to
     * @param value Amount of tokens to transfer
     * @return success Boolean indicating if transfer was successful
     */
    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public returns (bool success) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        require(to != address(0), "Cannot transfer to zero address");

        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;

        emit Transfer(from, to, value);
        return true;
    }

    /**
     * @dev Approve spender to spend tokens on behalf of owner
     * @param spender Address allowed to spend tokens
     * @param value Amount of tokens to approve
     * @return success Boolean indicating if approval was successful
     */
    function approve(
        address spender,
        uint256 value
    ) public returns (bool success) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    /**
     * @dev Mint new tokens to specified address (owner only)
     * @param to Address to mint tokens to
     * @param value Amount of tokens to mint
     */
    function mint(address to, uint256 value) public onlyOwner {
        require(to != address(0), "Cannot mint to zero address");

        balanceOf[to] += value;
        totalSupply += value;

        emit Mint(to, value);
        emit Transfer(address(0), to, value);
    }

    /**
     * @dev Get token balance of an address
     * @param account Address to check balance for
     * @return balance Token balance of the address
     */
    function getBalance(address account) public view returns (uint256 balance) {
        return balanceOf[account];
    }
}

