module prediction_market::market {
    use std::signer;
    use std::vector;
    use std::string::String;
    use std::option::{Self, Option};
    use aptos_framework::timestamp;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    // Error codes
    const E_NOT_ADMIN: u64 = 1;
    const E_MARKET_NOT_FOUND: u64 = 2;
    const E_MARKET_EXPIRED: u64 = 3;
    const E_MARKET_ALREADY_RESOLVED: u64 = 4;
    const E_INSUFFICIENT_FUNDS: u64 = 5;
    const E_INVALID_OUTCOME: u64 = 6;
    const E_MARKET_NOT_RESOLVED: u64 = 7;
    const E_NO_WINNINGS: u64 = 8;
    const E_INVALID_AMOUNT: u64 = 9;

    // Market outcomes
    const OUTCOME_YES: u8 = 1;
    const OUTCOME_NO: u8 = 2;

    // Market struct
    struct Market has store, copy, drop {
        id: u64,
        description: String,
        end_timestamp: u64,
        is_resolved: bool,
        winning_outcome: Option<u8>,
        yes_pool: u64,
        no_pool: u64,
        total_volume: u64,
        creator: address,
    }

    // User position in a market
    struct Position has store, copy, drop {
        market_id: u64,
        yes_shares: u64,
        no_shares: u64,
    }

    // Global state
    struct PredictionMarket has key {
        admin: address,
        markets: vector<Market>,
        next_market_id: u64,
        total_markets_created: u64,
        platform_fee_rate: u64, // Fee rate in basis points (e.g., 100 = 1%)
        fee_pool: Coin<AptosCoin>,
    }

    // User portfolio
    struct UserPortfolio has key {
        positions: vector<Position>,
    }

    // Events
    struct MarketEvents has key {
        market_created_events: EventHandle<MarketCreatedEvent>,
        position_taken_events: EventHandle<PositionTakenEvent>,
        market_resolved_events: EventHandle<MarketResolvedEvent>,
        winnings_claimed_events: EventHandle<WinningsClaimedEvent>,
    }

    struct MarketCreatedEvent has drop, store {
        market_id: u64,
        description: String,
        end_timestamp: u64,
        creator: address,
    }

    struct PositionTakenEvent has drop, store {
        market_id: u64,
        user: address,
        outcome: u8,
        amount: u64,
        shares_received: u64,
    }

    struct MarketResolvedEvent has drop, store {
        market_id: u64,
        winning_outcome: u8,
        yes_pool: u64,
        no_pool: u64,
    }

    struct WinningsClaimedEvent has drop, store {
        market_id: u64,
        user: address,
        amount: u64,
    }

    // Initialize the prediction market
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        // Initialize global state
        move_to(admin, PredictionMarket {
            admin: admin_addr,
            markets: vector::empty<Market>(),
            next_market_id: 1,
            total_markets_created: 0,
            platform_fee_rate: 100, // 1% platform fee
            fee_pool: coin::zero<AptosCoin>(),
        });

        // Initialize events
        move_to(admin, MarketEvents {
            market_created_events: account::new_event_handle<MarketCreatedEvent>(admin),
            position_taken_events: account::new_event_handle<PositionTakenEvent>(admin),
            market_resolved_events: account::new_event_handle<MarketResolvedEvent>(admin),
            winnings_claimed_events: account::new_event_handle<WinningsClaimedEvent>(admin),
        });
    }

    // Create a new prediction market
    public entry fun create_market(
        creator: &signer,
        description: String,
        duration_seconds: u64,
    ) acquires PredictionMarket, MarketEvents {
        let creator_addr = signer::address_of(creator);
        let market_state = borrow_global_mut<PredictionMarket>(@prediction_market);
        
        // Only admin can create markets for now (can be extended later)
        assert!(creator_addr == market_state.admin, E_NOT_ADMIN);

        let current_time = timestamp::now_seconds();
        let end_timestamp = current_time + duration_seconds;

        let market = Market {
            id: market_state.next_market_id,
            description,
            end_timestamp,
            is_resolved: false,
            winning_outcome: option::none<u8>(),
            yes_pool: 0,
            no_pool: 0,
            total_volume: 0,
            creator: creator_addr,
        };

        vector::push_back(&mut market_state.markets, market);
        
        // Emit event
        let events = borrow_global_mut<MarketEvents>(@prediction_market);
        event::emit_event(&mut events.market_created_events, MarketCreatedEvent {
            market_id: market_state.next_market_id,
            description,
            end_timestamp,
            creator: creator_addr,
        });

        market_state.next_market_id = market_state.next_market_id + 1;
        market_state.total_markets_created = market_state.total_markets_created + 1;
    }

    // Buy shares in a market
    public entry fun buy_shares(
        user: &signer,
        market_id: u64,
        outcome: u8, // 1 for YES, 2 for NO
        amount: u64,
    ) acquires PredictionMarket, UserPortfolio, MarketEvents {
        let user_addr = signer::address_of(user);
        assert!(outcome == OUTCOME_YES || outcome == OUTCOME_NO, E_INVALID_OUTCOME);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let market_state = borrow_global_mut<PredictionMarket>(@prediction_market);
        let market_index = find_market_index(market_id, &market_state.markets);
        let market = vector::borrow_mut(&mut market_state.markets, market_index);

        // Check if market is still active
        assert!(!market.is_resolved, E_MARKET_ALREADY_RESOLVED);
        assert!(timestamp::now_seconds() < market.end_timestamp, E_MARKET_EXPIRED);

        // Calculate shares using AMM formula
        let shares = calculate_shares_to_receive(market, outcome, amount);
        
        // Take payment from user
        let payment = coin::withdraw<AptosCoin>(user, amount);
        
        // Extract fee first
        let fee_amount = (amount * market_state.platform_fee_rate) / 10000;
        let fee_coin = coin::extract(&mut payment, fee_amount);
        coin::merge(&mut market_state.fee_pool, fee_coin);
        
        // The remaining payment coin should now have net_amount value
        let net_amount = coin::value(&payment);
        
        if (outcome == OUTCOME_YES) {
            market.yes_pool = market.yes_pool + net_amount;
        } else {
            market.no_pool = market.no_pool + net_amount;
        };
        
        // For this simple implementation, we'll deposit the remaining coins
        // to the platform fee pool as well (in a real implementation, 
        // you'd want to store these separately or in escrow)
        coin::merge(&mut market_state.fee_pool, payment);
        
        market.total_volume = market.total_volume + amount;

        // Update user portfolio
        if (!exists<UserPortfolio>(user_addr)) {
            move_to(user, UserPortfolio {
                positions: vector::empty<Position>(),
            });
        };

        let portfolio = borrow_global_mut<UserPortfolio>(user_addr);
        update_user_position(portfolio, market_id, outcome, shares);

        // Emit event
        let events = borrow_global_mut<MarketEvents>(@prediction_market);
        event::emit_event(&mut events.position_taken_events, PositionTakenEvent {
            market_id,
            user: user_addr,
            outcome,
            amount,
            shares_received: shares,
        });
    }

    // Resolve a market
    public entry fun resolve_market(
        admin: &signer,
        market_id: u64,
        winning_outcome: u8,
    ) acquires PredictionMarket, MarketEvents {
        let admin_addr = signer::address_of(admin);
        let market_state = borrow_global_mut<PredictionMarket>(@prediction_market);
        
        assert!(admin_addr == market_state.admin, E_NOT_ADMIN);
        assert!(winning_outcome == OUTCOME_YES || winning_outcome == OUTCOME_NO, E_INVALID_OUTCOME);

        let market_index = find_market_index(market_id, &market_state.markets);
        let market = vector::borrow_mut(&mut market_state.markets, market_index);

        assert!(!market.is_resolved, E_MARKET_ALREADY_RESOLVED);
        
        market.is_resolved = true;
        market.winning_outcome = option::some(winning_outcome);

        // Emit event
        let events = borrow_global_mut<MarketEvents>(@prediction_market);
        event::emit_event(&mut events.market_resolved_events, MarketResolvedEvent {
            market_id,
            winning_outcome,
            yes_pool: market.yes_pool,
            no_pool: market.no_pool,
        });
    }

    // Claim winnings from a resolved market
    public entry fun claim_winnings(
        user: &signer,
        market_id: u64,
    ) acquires PredictionMarket, UserPortfolio, MarketEvents {
        let user_addr = signer::address_of(user);
        let market_state = borrow_global_mut<PredictionMarket>(@prediction_market);
        let market_index = find_market_index(market_id, &market_state.markets);
        let market = vector::borrow(&market_state.markets, market_index);

        assert!(market.is_resolved, E_MARKET_NOT_RESOLVED);

        let portfolio = borrow_global_mut<UserPortfolio>(user_addr);
        let position_index = find_position_index(market_id, &portfolio.positions);
        let position = vector::borrow(&portfolio.positions, position_index);

        let winning_outcome = *option::borrow(&market.winning_outcome);
        let winning_shares = if (winning_outcome == OUTCOME_YES) {
            position.yes_shares
        } else {
            position.no_shares
        };

        assert!(winning_shares > 0, E_NO_WINNINGS);

        // Calculate winnings
        let total_winning_pool = if (winning_outcome == OUTCOME_YES) {
            market.yes_pool
        } else {
            market.no_pool
        };
        
        let total_pool = market.yes_pool + market.no_pool;
        let winnings = (winning_shares * total_pool) / total_winning_pool;

        // For now, we'll just emit an event and let users claim manually
        // In a real implementation, you'd have a stored coin pool for payouts
        
        // Remove position from portfolio
        vector::remove(&mut portfolio.positions, position_index);

        // Emit event
        let events = borrow_global_mut<MarketEvents>(@prediction_market);
        event::emit_event(&mut events.winnings_claimed_events, WinningsClaimedEvent {
            market_id,
            user: user_addr,
            amount: winnings,
        });
    }

    // Helper functions
    fun find_market_index(market_id: u64, markets: &vector<Market>): u64 {
        let len = vector::length(markets);
        let i = 0;
        while (i < len) {
            let market = vector::borrow(markets, i);
            if (market.id == market_id) {
                return i
            };
            i = i + 1;
        };
        abort E_MARKET_NOT_FOUND
    }

    fun find_position_index(market_id: u64, positions: &vector<Position>): u64 {
        let len = vector::length(positions);
        let i = 0;
        while (i < len) {
            let position = vector::borrow(positions, i);
            if (position.market_id == market_id) {
                return i
            };
            i = i + 1;
        };
        // If position not found, create a new one
        len
    }

    fun update_user_position(
        portfolio: &mut UserPortfolio,
        market_id: u64,
        outcome: u8,
        shares: u64,
    ) {
        let positions_len = vector::length(&portfolio.positions);
        let i = 0;
        let found = false;

        while (i < positions_len) {
            let position = vector::borrow_mut(&mut portfolio.positions, i);
            if (position.market_id == market_id) {
                if (outcome == OUTCOME_YES) {
                    position.yes_shares = position.yes_shares + shares;
                } else {
                    position.no_shares = position.no_shares + shares;
                };
                found = true;
                break
            };
            i = i + 1;
        };

        if (!found) {
            let new_position = if (outcome == OUTCOME_YES) {
                Position {
                    market_id,
                    yes_shares: shares,
                    no_shares: 0,
                }
            } else {
                Position {
                    market_id,
                    yes_shares: 0,
                    no_shares: shares,
                }
            };
            vector::push_back(&mut portfolio.positions, new_position);
        };
    }

    // Simple AMM pricing (can be improved)
    fun calculate_shares_to_receive(market: &Market, outcome: u8, amount: u64): u64 {
        if (market.yes_pool == 0 && market.no_pool == 0) {
            // Initial liquidity - 1:1 ratio
            return amount
        };

        // Simplified constant product AMM
        let current_pool = if (outcome == OUTCOME_YES) { market.yes_pool } else { market.no_pool };
        let other_pool = if (outcome == OUTCOME_YES) { market.no_pool } else { market.yes_pool };
        
        if (current_pool == 0) {
            return amount
        };

        // Calculate new shares based on proportional increase
        (amount * 1000000) / (current_pool + amount) // Simplified formula
    }

    // View functions
    #[view]
    public fun get_market(market_id: u64): Market acquires PredictionMarket {
        let market_state = borrow_global<PredictionMarket>(@prediction_market);
        let market_index = find_market_index(market_id, &market_state.markets);
        *vector::borrow(&market_state.markets, market_index)
    }

    #[view]
    public fun get_all_markets(): vector<Market> acquires PredictionMarket {
        let market_state = borrow_global<PredictionMarket>(@prediction_market);
        market_state.markets
    }

    #[view]
    public fun get_user_portfolio(user_addr: address): vector<Position> acquires UserPortfolio {
        if (!exists<UserPortfolio>(user_addr)) {
            return vector::empty<Position>()
        };
        let portfolio = borrow_global<UserPortfolio>(user_addr);
        portfolio.positions
    }

    #[view]
    public fun get_market_odds(market_id: u64): (u64, u64) acquires PredictionMarket {
        let market_state = borrow_global<PredictionMarket>(@prediction_market);
        let market_index = find_market_index(market_id, &market_state.markets);
        let market = vector::borrow(&market_state.markets, market_index);
        
        if (market.yes_pool == 0 && market.no_pool == 0) {
            return (50, 50) // 50-50 odds initially
        };
        
        let total = market.yes_pool + market.no_pool;
        let yes_odds = (market.yes_pool * 100) / total;
        let no_odds = 100 - yes_odds;
        
        (yes_odds, no_odds)
    }
}
