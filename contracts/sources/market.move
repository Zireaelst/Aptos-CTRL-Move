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
    
    // Pyth Oracle imports
    use pyth::pyth;
    use pyth::price::{Self, Price};
    use pyth::price_identifier;
    use std::string;

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
    const E_INSUFFICIENT_STAKE: u64 = 10;
    const E_MARKET_NOT_EXPIRED: u64 = 11;
    const E_INVALID_STAKE_THRESHOLD: u64 = 12;
    const E_INVALID_CATEGORY_COUNT: u64 = 13;
    const E_CATEGORY_NOT_FOUND: u64 = 14;
    const E_INVALID_PYTH_DATA: u64 = 15;

    // Market outcomes (extended for categorical markets)
    const OUTCOME_YES: u8 = 1;
    const OUTCOME_NO: u8 = 2;
    const OUTCOME_CATEGORICAL_START: u8 = 10; // Categories start from 10

    // Market types
    const MARKET_TYPE_BINARY: u8 = 1;
    const MARKET_TYPE_CATEGORICAL: u8 = 2;

    // Market struct (enhanced with Pyth and categorical support)
    struct Market has store, copy, drop {
        id: u64,
        description: String,
        market_type: u8, // 1 for binary, 2 for categorical
        num_categories: u8, // For categorical markets
        category_names: vector<String>, // For categorical markets
        end_timestamp: u64,
        is_resolved: bool,
        winning_outcome: Option<u8>,
        // Binary market pools
        yes_pool: u64,
        no_pool: u64,
        // Categorical market pools (index corresponds to category starting from 0)
        categorical_pools: vector<u64>,
        total_volume: u64,
        creator: address,
        creator_stake: u64,
        pyth_feed_id: vector<u8>, // Pyth oracle feed ID for auto-resolution
        resolution_threshold: u64, // Threshold value for binary resolution
    }

    // User position in a market (enhanced for categorical)
    struct Position has store, copy, drop {
        market_id: u64,
        market_type: u8,
        // Binary position
        yes_shares: u64,
        no_shares: u64,
        // Categorical position (shares for each category)
        categorical_shares: vector<u64>,
    }

    // Global state
    struct PredictionMarket has key {
        admin: address,
        markets: vector<Market>,
        next_market_id: u64,
        total_markets_created: u64,
        platform_fee_rate: u64, // Fee rate in basis points (e.g., 100 = 1%)
        fee_pool: Coin<AptosCoin>,
        minimum_stake_requirement: u64, // Minimum APT stake to create market
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
        market_auto_resolved_events: EventHandle<MarketAutoResolvedEvent>,
    }

    struct MarketCreatedEvent has drop, store {
        market_id: u64,
        description: String,
        market_type: u8,
        end_timestamp: u64,
        creator: address,
        creator_stake: u64,
        pyth_feed_id: vector<u8>,
    }

    struct PositionTakenEvent has drop, store {
        market_id: u64,
        user: address,
        outcome: u8,
        amount: u64,
        shares_received: u64,
        market_type: u8,
    }

    struct MarketResolvedEvent has drop, store {
        market_id: u64,
        winning_outcome: u8,
        resolution_type: String, // "manual" or "oracle"
        total_pool: u64,
    }

    struct MarketAutoResolvedEvent has drop, store {
        market_id: u64,
        pyth_price: u64,
        threshold: u64,
        winning_outcome: u8,
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
            minimum_stake_requirement: 100000000, // 100 APT default minimum stake
        });

        // Initialize events
        move_to(admin, MarketEvents {
            market_created_events: account::new_event_handle<MarketCreatedEvent>(admin),
            position_taken_events: account::new_event_handle<PositionTakenEvent>(admin),
            market_resolved_events: account::new_event_handle<MarketResolvedEvent>(admin),
            winnings_claimed_events: account::new_event_handle<WinningsClaimedEvent>(admin),
            market_auto_resolved_events: account::new_event_handle<MarketAutoResolvedEvent>(admin),
        });
    }

    // Set minimum stake requirement (admin only)
    public entry fun set_minimum_stake_requirement(admin: &signer, minimum_stake: u64) acquires PredictionMarket {
        let admin_addr = signer::address_of(admin);
        let market_state = borrow_global_mut<PredictionMarket>(@prediction_market);
        
        assert!(admin_addr == market_state.admin, E_NOT_ADMIN);
        assert!(minimum_stake > 0, E_INVALID_STAKE_THRESHOLD);
        
        market_state.minimum_stake_requirement = minimum_stake;
    }

    // Create a binary prediction market (decentralized with stake requirement)
    public entry fun create_binary_market(
        creator: &signer,
        description: String,
        duration_seconds: u64,
        pyth_feed_id: vector<u8>,
        threshold_value: u64, // Threshold above which YES wins
    ) acquires PredictionMarket, MarketEvents {
        let creator_addr = signer::address_of(creator);
        let market_state = borrow_global_mut<PredictionMarket>(@prediction_market);
        
        // Check stake requirement
        assert!(pyth::coin::balance<AptosCoin>(creator_addr) >= market_state.minimum_stake_requirement, E_INSUFFICIENT_STAKE);
        
        // Stake creators' coins
        let stake_coin = coin::withdraw<AptosCoin>(creator, market_state.minimum_stake_requirement);
        coin::merge(&mut market_state.fee_pool, stake_coin);

        let current_time = timestamp::now_seconds();
        let end_timestamp = current_time + duration_seconds;

        let market = Market {
            id: market_state.next_market_id,
            description,
            market_type: MARKET_TYPE_BINARY,
            num_categories: 0, // Not used for binary markets
            category_names: vector::empty<String>(),
            end_timestamp,
            is_resolved: false,
            winning_outcome: option::none<u8>(),
            yes_pool: 0,
            no_pool: 0,
            categorical_pools: vector::empty<u64>(),
            total_volume: 0,
            creator: creator_addr,
            creator_stake: market_state.minimum_stake_requirement,
            pyth_feed_id,
            resolution_threshold: threshold_value,
        };

        vector::push_back(&mut market_state.markets, market);
        
        // Emit event
        let events = borrow_global_mut<MarketEvents>(@prediction_market);
        event::emit_event(&mut events.market_created_events, MarketCreatedEvent {
            market_id: market_state.next_market_id,
            description,
            market_type: MARKET_TYPE_BINARY,
            end_timestamp,
            creator: creator_addr,
            creator_stake: market_state.minimum_stake_requirement,
            pyth_feed_id,
        });

        market_state.next_market_id = market_state.next_market_id + 1;
        market_state.total_markets_created = market_state.total_markets_created + 1;
    }

    // Create a categorical prediction market
    public entry fun create_categorical_market(
        creator: &signer,
        description: String,
        category_names: vector<String>,
        duration_seconds: u64,
        pyth_feed_id: vector<u8>,
        threshold_value: u64,
    ) acquires PredictionMarket, MarketEvents {
        let creator_addr = signer::address_of(creator);
        let market_state = borrow_global_mut<PredictionMarket>(@prediction_market);
        
        // Check stake requirement
        assert!(coin::balance<AptosCoin>(creator_addr) >= market_state.minimum_stake_requirement, E_INSUFFICIENT_STAKE);
        
        let num_categories = vector::length(&category_names);
        assert!(num_categories >= 2 && num_categories <= 10, E_INVALID_CATEGORY_COUNT); // Limit to 10 categories

        // Stake creators' coins
        let stake_coin = coin::withdraw<AptosCoin>(creator, market_state.minimum_stake_requirement);
        coin::merge(&mut market_state.fee_pool, stake_coin);

        let current_time = timestamp::now_seconds();
        let end_timestamp = current_time + duration_seconds;

        let market = Market {
            id: market_state.next_market_id,
            description,
            market_type: MARKET_TYPE_CATEGORICAL,
            num_categories: (num_categories as u8),
            category_names,
            end_timestamp,
            is_resolved: false,
            winning_outcome: option::none<u8>(),
            yes_pool: 0,
            no_pool: 0,
            categorical_pools: vector::empty<u64>(),
            total_volume: 0,
            creator: creator_addr,
            creator_stake: market_state.minimum_stake_requirement,
            pyth_feed_id,
            resolution_threshold: threshold_value,
        };

        vector::push_back(&mut market_state.markets, market);
        
        // Emit event
        let events = borrow_global_mut<MarketEvents>(@prediction_market);
        event::emit_event(&mut events.market_created_events, MarketCreatedEvent {
            market_id: market_state.next_market_id,
            description,
            market_type: MARKET_TYPE_CATEGORICAL,
            end_timestamp,
            creator: creator_addr,
            creator_stake: market_state.minimum_stake_requirement,
            pyth_feed_id,
        });

        market_state.next_market_id = market_state.next_market_id + 1;
        market_state.total_markets_created = market_state.total_markets_created + 1;
    }

    // Auto-resolve market using Pyth Oracle data (public function)
    public entry fun auto_resolve_market_with_pyth(
        user: &signer,
        market_id: u64,
        pyth_price_update: vector<vector<u8>>,
    ) acquires PredictionMarket, MarketEvents {
        let user_addr = signer::address_of(user);
        let market_state = borrow_global_mut<PredictionMarket>(@prediction_market);
        
        // Find market
        let market_index = find_market_index(market_id, &market_state.markets);
        let market = vector::borrow_mut(&mut market_state.markets, market_index);

        // Validate market can be resolved
        assert!(!market.is_resolved, E_MARKET_ALREADY_RESOLVED);
        assert!(timestamp::now_seconds() >= market.end_timestamp, E_MARKET_NOT_EXPIRED);

        // First update the Pyth price feeds and pay the fee
        let fee_coins = coin::withdraw(user, pyth::get_update_fee(&pyth_price_update));
        pyth::update_price_feeds(pyth_price_update, fee_coins);

        // Get the Pyth price
        let price_identifier = price_identifier::from_byte_vec(market.pyth_feed_id);
        let price = pyth::get_price(price_identifier);
        
        // Validate price data
        let exponent = pyth::get_exponent(price);
        let price_value = pyth::get_conf(price);
        
        // Check if price is valid and recent
        assert!(price_value > 0, E_INVALID_PYTH_DATA);
        
        // Calculate market outcome based on price vs threshold
        let winning_outcome: u8;
        
        if (market.market_type == MARKET_TYPE_BINARY) {
            // For binary markets: YES if price > threshold, NO otherwise
            winning_outcome = if (price_value > market.resolution_threshold) { OUTCOME_YES } else { OUTCOME_NO };
        } else {
            // For categorical markets: map price to category range
            // This is a simplified mapping - in practice you'd want more sophisticated logic
            let price_rem = price_value % (market.num_categories as u64);
            winning_outcome = OUTCOME_CATEGORICAL_START + (price_rem as u8);
        };

        // Resolve the market
        market.is_resolved = true;
        market.winning_outcome = option::some(winning_outcome);

        // Emit events
        let events = borrow_global_mut<MarketEvents>(@prediction_market);
        
        // Emit auto-resolution event with price data
        event::emit_event(&mut events.market_auto_resolved_events, MarketAutoResolvedEvent {
            market_id,
            pyth_price: price_value,
            threshold: market.resolution_threshold,
            winning_outcome,
        });
        
        // Emit general resolution event
        let total_pool = market.yes_pool + market.no_pool + vector::sum(&market.categorical_pools);
        event::emit_event(&mut events.market_resolved_events, MarketResolvedEvent {
            market_id,
            winning_outcome,
            resolution_type: string::utf8(b"oracle"),
            total_pool: total_pool,
        });
    }

    // Buy shares in a market (enhanced for both binary and categorical)
    public entry fun buy_shares(
        user: &signer,
        market_id: u64,
        outcome: u8, // 1-2 for binary YES/NO, 10+ for categorical
        amount: u64,
    ) acquires PredictionMarket, UserPortfolio, MarketEvents {
        let user_addr = signer::address_of(user);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let market_state = borrow_global_mut<PredictionMarket>(@prediction_market);
        let market_index = find_market_index(market_id, &market_state.markets);
        let market = vector::borrow_mut(&mut market_state.markets, market_index);

        // Check if market is still active
        assert!(!market.is_resolved, E_MARKET_ALREADY_RESOLVED);
        assert!(timestamp::now_seconds() < market.end_timestamp, E_MARKET_EXPIRED);

        // Validate outcome based on market type
        if (market.market_type == MARKET_TYPE_BINARY) {
            assert!(outcome == OUTCOME_YES || outcome == OUTCOME_NO, E_INVALID_OUTCOME);
        } else {
            assert!(outcome >= OUTCOME_CATEGORICAL_START, E_INVALID_OUTCOME);
            let category_index = outcome - OUTCOME_CATEGORICAL_START;
            assert!(category_index < market.num_categories, E_CATEGORY_NOT_FOUND);
        };

        // Calculate shares using LMSR (Logarithmic Market Scoring Rule)
        let shares = calculate_shares_with_lmsr(market, outcome, amount);
        
        // Take payment from user
        let payment = coin::withdraw<AptosCoin>(user, amount);
        
        // Extract fee first
        let fee_amount = (amount * market_state.platform_fee_rate) / 10000;
        let fee_coin = coin::extract(&mut payment, fee_amount);
        coin::merge(&mut market_state.fee_pool, fee_coin);
        
        // The remaining payment coin should now have net_amount value
        let net_amount = coin::value(&payment);
        
        // Update pools based on market type and outcome
        if (market.market_type == MARKET_TYPE_BINARY) {
            if (outcome == OUTCOME_YES) {
                market.yes_pool = market.yes_pool + net_amount;
            } else {
                market.no_pool = market.no_pool + net_amount;
            };
        } else {
            let category_index = outcome - OUTCOME_CATEGORICAL_START;
            // Ensure categorical_pools has enough elements
            while (vector::length(&market.categorical_pools) <= category_index) {
                vector::push_back(&mut market.categorical_pools, 0);
            };
            let pool_ref = vector::borrow_mut(&mut market.categorical_pools, category_index);
            *pool_ref = *pool_ref + net_amount;
        };
        
        // For this implementation, we'll deposit the remaining coins to the platform fee pool
        // In a real implementation, you'd want to store these separately or in escrow
        coin::merge(&mut market_state.fee_pool, payment);
        
        market.total_volume = market.total_volume + amount;

        // Update user portfolio
        if (!exists<UserPortfolio>(user_addr)) {
            move_to(user, UserPortfolio {
                positions: vector::empty<Position>(),
            });
        };

        let portfolio = borrow_global_mut<UserPortfolio>(user_addr);
        update_user_position(portfolio, market_id, outcome, shares, market.market_type);

        // Emit event
        let events = borrow_global_mut<MarketEvents>(@prediction_market);
        event::emit_event(&mut events.position_taken_events, PositionTakenEvent {
            market_id,
            user: user_addr,
            outcome,
            amount,
            shares_received: shares,
            market_type: market.market_type,
        });
    }

    // Manual market resolution (admin only backup method)
    public entry fun manual_resolve_market(
        admin: &signer,
        market_id: u64,
        winning_outcome: u8,
    ) acquires PredictionMarket, MarketEvents {
        let admin_addr = signer::address_of(admin);
        let market_state = borrow_global_mut<PredictionMarket>(@prediction_market);
        
        assert!(admin_addr == market_state.admin, E_NOT_ADMIN);

        let market_index = find_market_index(market_id, &market_state.markets);
        let market = vector::borrow_mut(&mut market_state.markets, market_index);

        assert!(!market.is_resolved, E_MARKET_ALREADY_RESOLVED);
        
        // Validate outcome based on market type
        if (market.market_type == MARKET_TYPE_BINARY) {
            assert!(winning_outcome == OUTCOME_YES || winning_outcome == OUTCOME_NO, E_INVALID_OUTCOME);
        } else {
            let category_index = winning_outcome - OUTCOME_CATEGORICAL_START;
            assert!(category_index < market.num_categories, E_CATEGORY_NOT_FOUND);
        };
        
        market.is_resolved = true;
        market.winning_outcome = option::some(winning_outcome);

        // Emit event
        let events = borrow_global_mut<MarketEvents>(@prediction_market);
        let total_pool = market.yes_pool + market.no_pool + vector::sum(&market.categorical_pools);
        event::emit_event(&mut events.market_resolved_events, MarketResolvedEvent {
            market_id,
            winning_outcome,
            resolution_type: string::utf8(b"manual"),
            total_pool: total_pool,
        });
    }

    // Claim winnings from a resolved market (enhanced for categorical markets)
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
        let winning_shares: u64;
        
        if (market.market_type == MARKET_TYPE_BINARY) {
            winning_shares = if (winning_outcome == OUTCOME_YES) {
                position.yes_shares
            } else {
                position.no_shares
            };
        } else {
            let category_index = winning_outcome - OUTCOME_CATEGORICAL_START;
            winning_shares = *vector::borrow(&position.categorical_shares, category_index);
        };

        assert!(winning_shares > 0, E_NO_WINNINGS);

        // Calculate winnings
        let total_winning_pool = if (market.market_type == MARKET_TYPE_BINARY) {
            if (winning_outcome == OUTCOME_YES) {
                market.yes_pool
            } else {
                market.no_pool
            }
        } else {
            let category_index = winning_outcome - OUTCOME_CATEGORICAL_START;
            *vector::borrow(&market.categorical_pools, category_index)
        };
        
        let total_pool = market.yes_pool + market.no_pool + vector::sum(&market.categorical_pools);
        let winnings = (winning_shares * total_pool) / total_winning_pool;

        // In a real implementation, you'd have a stored coin pool for payouts
        // For now, we'll just emit an event and let users claim manually
        
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
        // If position not found, return len (invalid index)
        len
    }

    fun update_user_position(
        portfolio: &mut UserPortfolio,
        market_id: u64,
        outcome: u8,
        shares: u64,
        market_type: u8,
    ) {
        let positions_len = vector::length(&portfolio.positions);
        let i = 0;
        let found = false;

        while (i < positions_len) {
            let position = vector::borrow_mut(&mut portfolio.positions, i);
            if (position.market_id == market_id) {
                if (market_type == MARKET_TYPE_BINARY) {
                    if (outcome == OUTCOME_YES) {
                        position.yes_shares = position.yes_shares + shares;
                    } else {
                        position.no_shares = position.no_shares + shares;
                    };
                } else {
                    let category_index = outcome - OUTCOME_CATEGORICAL_START;
                    // Ensure categorical_shares has enough elements
                    while (vector::length(&position.categorical_shares) <= category_index) {
                        vector::push_back(&mut position.categorical_shares, 0);
                    };
                    let shares_ref = vector::borrow_mut(&mut position.categorical_shares, category_index);
                    *shares_ref = *shares_ref + shares;
                };
                found = true;
                break
            };
            i = i + 1;
        };

        if (!found) {
            let new_position = if (market_type == MARKET_TYPE_BINARY) {
                Position {
                    market_id,
                    market_type,
                    yes_shares: if (outcome == OUTCOME_YES) shares else 0,
                    no_shares: if (outcome == OUTCOME_NO) shares else 0,
                    categorical_shares: vector::empty<u64>(),
                }
            } else {
                Position {
                    market_id,
                    market_type,
                    yes_shares: 0,
                    no_shares: 0,
                    categorical_shares: vector::empty<u64>(),
                }
            };
            
            if (market_type == MARKET_TYPE_CATEGORICAL) {
                let category_index = outcome - OUTCOME_CATEGORICAL_START;
                while (vector::length(&new_position.categorical_shares) <= category_index) {
                    vector::push_back(&mut new_position.categorical_shares, 0);
                };
                let shares_ref = vector::borrow_mut(&mut new_position.categorical_shares, category_index);
                *shares_ref = shares;
            };
            
            vector::push_back(&mut portfolio.positions, new_position);
        };
    }

    // LMSR (Logarithmic Market Scoring Rule) pricing algorithm
    fun calculate_shares_with_lmsr(market: &Market, outcome: u8, amount: u64): u64 {
        // For simplicity, we'll implement a basic LMSR variant
        // In practice, you'd want a more sophisticated implementation
        
        if (market.market_type == MARKET_TYPE_BINARY) {
            let current_pool = if (outcome == OUTCOME_YES) { market.yes_pool } else { market.no_pool };
            
            if (current_pool == 0 && market.yes_pool == 0 && market.no_pool == 0) {
                // Initial liquidity - 1:1 ratio
                return amount
            };
            
            // Simplified LMSR-based calculation
            // Using a liquidity parameter (b=1000) for market maker formula
            let liquidity_parameter = 1000000000; // 1000 APT in octas
            let exp_amount = (amount * 1000000) / liquidity_parameter;
            let exp_ratio = current_pool * 1000000 / liquidity_parameter;
            
            // Simplified exponential calculation avoiding overflow
            if (exp_amount < 1000000) {
                return (amount * 1000000) / (1000000 + exp_ratio)
            } else {
                // Fallback to linear scaling for large amounts
                return amount / 2
            }
        } else {
            // For categorical markets
            let category_index = outcome - OUTCOME_CATEGORICAL_START;
            let current_pool = if (vector::length(&market.categorical_pools) > category_index) {
                *vector::borrow(&market.categorical_pools, category_index)
            } else {
                0
            };
            
            // Similar calculation as binary but for categorical
            if (current_pool == 0) {
                return amount
            };
            
            let liquidity_parameter = 1000000000;
            let exp_amount = (amount * 1000000) / liquidity_parameter;
            let exp_ratio = current_pool * 1000000 / liquidity_parameter;
            
            if (exp_amount < 1000000) {
                return (amount * 1000000) / (1000000 + exp_ratio)
            } else {
                return amount / 2
            }
        }
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
    public fun get_market_odds(market_id: u64): (vector<u64>, vector<String>) acquires PredictionMarket {
        let market_state = borrow_global<PredictionMarket>(@prediction_market);
        let market_index = find_market_index(market_id, &market_state.markets);
        let market = vector::borrow(&market_state.markets, market_index);
        
        if (market.market_type == MARKET_TYPE_BINARY) {
            if (market.yes_pool == 0 && market.no_pool == 0) {
                let odds = vector::empty<u64>();
                vector::push_back(&mut odds, 50); // YES odds
                vector::push_back(&mut odds, 50); // NO odds
                let descriptions = vector::empty<String>();
                vector::push_back(&mut descriptions, string::utf8(b"YES"));
                vector::push_back(&mut descriptions, string::utf8(b"NO"));
                return (odds, descriptions)
            };
            
            let total = market.yes_pool + market.no_pool;
            let odds = vector::empty<u64>();
            let yes_odds = (market.yes_pool * 100) / total;
            let no_odds = 100 - yes_odds;
            vector::push_back(&mut odds, yes_odds);
            vector::push_back(&mut odds, no_odds);
            
            let descriptions = vector::empty<String>();
            vector::push_back(&mut descriptions, string::utf8(b"YES"));
            vector::push_back(&mut descriptions, string::utf8(b"NO"));
            return (odds, descriptions)
        } else {
            // For categorical markets
            let odds = vector::empty<u64>();
            let total_pool = vector::sum(&market.categorical_pools);
            
            if (total_pool == 0) {
                // Equal odds for all categories
                let num_categories = market.num_categories as u64;
                let equal_odds = 100 / num_categories;
                let i = 0;
                while (i < num_categories) {
                    vector::push_back(&mut odds, equal_odds);
                    i = i + 1;
                };
                return (odds, market.category_names)
            };
            
            let i = 0;
            while (i < (market.num_categories as u64)) {
                let pool = *vector::borrow(&market.categorical_pools, i);
                let category_odds = (pool * 100) / total_pool;
                vector::push_back(&mut odds, category_odds);
                i = i + 1;
            };
            
            return (odds, market.category_names)
        }
    }

    #[view]
    public fun get_platform_stats(): (u64, u64, u64) acquires PredictionMarket {
        let market_state = borrow_global<PredictionMarket>(@prediction_market);
        (
            market_state.total_markets_created,
            market_state.platform_fee_rate,
            coin::value(&market_state.fee_pool),
        )
    }
}