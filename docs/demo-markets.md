# Demo Markets for Aptos Predict

This file contains example markets that can be created to demonstrate the platform's capabilities.

## Market Creation Commands

After deploying the contracts, you can create these example markets:

```bash
# Market 1: Bitcoin Price Prediction
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::create_market \
  --args string:"Will Bitcoin (BTC) reach $100,000 by December 31, 2024?" u64:86400

# Market 2: Ethereum Price Prediction  
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::create_market \
  --args string:"Will Ethereum (ETH) surpass $5,000 in 2024?" u64:172800

# Market 3: Aptos Ecosystem Growth
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::create_market \
  --args string:"Will Aptos be in the top 10 cryptocurrencies by market cap by end of year?" u64:259200

# Market 4: DeFi Prediction
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::create_market \
  --args string:"Will Total Value Locked (TVL) in DeFi exceed $200 billion in 2024?" u64:345600

# Market 5: Technology Prediction
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::create_market \
  --args string:"Will a major tech company announce blockchain integration by Q4 2024?" u64:432000
```

## Example Betting Scenarios

### Scenario 1: Bull Market Believer
```bash
# Bet 10 APT on YES for Bitcoin reaching $100,000
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::buy_shares \
  --args u64:1 u8:1 u64:1000000000
```

### Scenario 2: Conservative Investor
```bash
# Bet 5 APT on NO for Ethereum surpassing $5,000
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::buy_shares \
  --args u64:2 u8:2 u64:500000000
```

### Scenario 3: Aptos Enthusiast
```bash
# Bet 20 APT on YES for Aptos being in top 10
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::buy_shares \
  --args u64:3 u8:1 u64:2000000000
```

## Market Resolution Examples

When markets reach their end time and outcomes are known:

```bash
# Resolve Bitcoin market - YES wins
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::resolve_market \
  --args u64:1 u8:1

# Resolve Ethereum market - NO wins
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::resolve_market \
  --args u64:2 u8:2
```

## Claiming Winnings

Winners can claim their rewards:

```bash
# Claim winnings from market 1
aptos move run \
  --function-id <CONTRACT_ADDRESS>::market::claim_winnings \
  --args u64:1
```

## Demo Script

For a quick demo, you can run this sequence:

1. Deploy contracts
2. Create 2-3 markets
3. Have different accounts place opposing bets
4. Show real-time odds changes
5. Resolve one market
6. Demonstrate winnings claim

This showcases:
- Market creation
- Dynamic pricing
- Multiple participants
- Resolution mechanism
- Payout system

## Testing Different Market States

### Active Markets
- Markets with end_timestamp in the future
- Show current odds and allow betting

### Expired Markets  
- Markets past their end_timestamp
- Prevent new bets, await resolution

### Resolved Markets
- Markets with winning_outcome set
- Show final results, allow claims

This comprehensive demo showcases all major features of the Aptos Predict platform.
