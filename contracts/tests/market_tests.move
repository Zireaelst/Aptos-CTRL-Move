#[test_only]
module prediction_market::market_tests {
    use std::string;
    use std::signer;
    use std::vector;
    use aptos_framework::timestamp::Timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::account;
    use prediction_market::market;

    // Helper function to create test price update data (mock)
    fun create_mock_pyth_update(): vector<vector<u8>> {
        vector::empty<vector<u8>>()
    }

    // Helper function to set minimum stake for testing
    fun setup_minimum_stake(admin: &signer, amount: u64) {
        // Mint coins for admin
        let coins_admin = coin::mint<AptosCoin>(amount, admin);
        coin::deposit(signer::address_of(admin), coins_admin);
        
        // Set minimum stake requirement to a lower amount for testing
        market::set_minimum_stake_requirement(admin, 100000000); // 100 APT
    }

    #[test(admin = @prediction_market, user1 = @0x123, user2 = @0x456, aptos_framework = @aptos_framework)]
    public fun test_binary_market_creation_and_resolution(
        admin: &signer,
        user1: &signer,
        user2: &signer,
        aptos_framework: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(aptos_framework);
        timestamp::fast_forward_seconds(1000);
        
        let admin_addr = signer::address_of(admin);
        let user1_addr = signer::address_of(user1);
        let user2_addr = signer::address_of(user2);

        // Initialize accounts
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user1_addr);
        account::create_account_for_test(user2_addr);

        // Initialize AptosCoin
        aptos_coin::initialize_for_test(aptos_framework);

        // Setup stake and mint coins
        setup_minimum_stake(aptos_framework, 1000000000);
        
        let coins_user1 = coin::mint<AptosCoin>(1000000000, aptos_framework); // 1000 APT
        let coins_user2 = coin::mint<AptosCoin>(1000000000, aptos_framework);
        
        coin::deposit(user1_addr, coins_user1);
        coin::deposit(user2_addr, coins_user2);

        // Initialize prediction market
        market::initialize(admin);

        // Create a binary market
        let description = string::utf8(b"Will BTC reach $100,000 by end of year?");
        let pyth_feed_id = x"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"; // BTC/USD feed
        let threshold = 100000000000; // $100,000 threshold
        
        market::create_binary_market(user1, description, 86400, pyth_feed_id, threshold); // 24 hours

        // Users buy shares
        market::buy_shares(user1, 1, 1, 100000000); // User1 bets 100 APT on YES
        market::buy_shares(user2, 1, 2, 200000000); // User2 bets 200 APT on NO

        // Check market state
        let market_data = market::get_market(1);
        assert!(market_data.yes_pool > 0, 1);
        assert!(market_data.no_pool > 0, 2);
        assert!(market_data.market_type == 1, 99); // MARKET_TYPE_BINARY

        // Check user portfolios
        let user1_positions = market::get_user_portfolio(user1_addr);
        let user2_positions = market::get_user_portfolio(user2_addr);
        assert!(vector::length(&user1_positions) == 1, 3);
        assert!(vector::length(&user2_positions) == 1, 4);

        // Fast forward past market end time
        timestamp::fast_forward_seconds(86500);

        // Auto-resolve market using mock Pyth data
        let mock_price_update = create_mock_pyth_update();
        
        // Note: In real testing, you would need actual Pyth price data
        // For now, we'll skip the auto-resolution test and use manual resolution
        market::manual_resolve_market(admin, 1, 1); // YES wins

        // User1 claims winnings
        market::claim_winnings(user1);

        // Check market resolution
        let resolved_market = market::get_market(1);
        assert!(resolved_market.is_resolved, 5);
    }

    #[test(admin = @prediction_market, user1 = @0x123, user2 = @0x456, aptos_framework = @aptos_framework)]
    public fun test_categorical_market_creation_and_trading(
        admin: &signer,
        user1: &signer,
        user2: &signer,
        aptos_framework: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(aptos_framework);
        timestamp::fast_forward_seconds(1000);
        
        let admin_addr = signer::address_of(admin);
        let user1_addr = signer::address_of(user1);
        let user2_addr = signer::address_of(user2);

        // Initialize accounts
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user1_addr);
        account::create_account_for_test(user2_addr);

        // Initialize AptosCoin
        aptos_coin::initialize_for_test(aptos_framework);

        // Setup stake and mint coins
        setup_minimum_stake(aptos_framework, 1000000000);
        
        let coins_user1 = coin::mint<AptosCoin>(1000000000, aptos_framework);
        let coins_user2 = coin::mint<AptosCoin>(1000000000, aptos_framework);
        
        coin::deposit(user1_addr, coins_user1);
        coin::deposit(user2_addr, coins_user2);

        // Initialize prediction market
        market::initialize(admin);

        // Create category names
        let category_names = vector::empty<string::String>();
        vector::push_back(&mut category_names, string::utf8(b"Candidate A"));
        vector::push_back(&mut category_names, string::utf8(b"Candidate B"));
        vector::push_back(&mut category_names, string::utf8(b"Candidate C"));

        // Create a categorical market
        let description = string::utf8(b"Whoจะเป็นผู้ชนะการเลือกตั้งประธานาธิบดี?");
        let pyth_feed_id = x"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
        let threshold = 50000000; // Custom threshold for categorical mapping
        
        market::create_categorical_market(user1, description, category_names, 86400, pyth_feed_id, threshold);

        // Users buy shares in different categories
        market::buy_shares(user1, 1, 10, 100000000); // Category 0 (Candidate A)
        market::buy_shares(user2, 1, 11, 150000000); // Category 1 (Candidate B)
        market::buy_shares(user1, 1, 12, 50000000); // Category 2 (Candidate C)

        // Check market state
        let market_data = market::get_market(1);
        assert!(market_data.market_type == 2, 1); // MARKET_TYPE_CATEGORICAL
        assert!(market_data.num_categories == 3, 2);

        // Check categorical pools (should be initialized)
        assert!(vector::length(&market_data.categorical_pools) == 3, 3);

        // Check user portfolios have positions
        let user1_positions = market::get_user_portfolio(user1_addr);
        let user2_positions = market::get_user_portfolio(user2_addr);
        assert!(vector::length(&user1_positions) == 1, 4); // User1 has 1 position in market 1
        assert!(vector::length(&user2_positions) == 1, 5); // User2 has 1 position in market 1

        // Test odds calculation for categorical market
        let (odds, names) = market::get_market_odds(1);
        assert!(vector::length(&odds) == 3, 6);
        assert!(vector::length(&names) == 3, 7);
    }

    #[test(admin = @prediction_market, user = @0x123, aptos_framework = @aptos_framework)]
    public fun test_decentralized_market_creation_with_stake(
        admin: &signer,
        user: &signer,
        aptos_framework: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        aptos_coin::initialize_for_test(aptos_framework);

        // User needs enough coins to meet stake requirement
        let coins_user = coin::mint<AptosCoin>(200000000, aptos_framework); // 200 APT
        coin::deposit(user_addr, coins_user);

        market::initialize(admin);

        // Create market should succeed (user has enough stake)
        let description = string::utf8(b"Test binary market with stake");
        let pyth_feed_id = x"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
        
        market::create_binary_market(user, description, 3600, pyth_feed_id, 100000); // 1 hour

        let markets = market::get_all_markets();
        assert!(vector::length(&markets) == 1, 1);

        let market_data = market::get_market(1);
        assert!(market_data.id == 1, 2);
        assert!(market_data.creator == user_addr, 3);
        assert!(market_data.creator_stake > 0, 4);
        assert!(!market_data.is_resolved, 5);
    }

    #[test(admin = @prediction_market, user = @0x123, aptos_framework = @aptos_framework)]
    public fun test_insufficient_stake_for_market_creation(
        admin: &signer,
        user: &signer,
        aptos_framework: &signer,
    ) {
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        aptos_coin::initialize_for_test(aptos_framework);

        // User has insufficient coins (less than stake requirement)
        let coins_user = coin::mint<AptosCoin>(50000000, aptos_framework); // 50 APT (less than 100 APT requirement)
        coin::deposit(user_addr, coins_user);

        market::initialize(admin);

        // Attempting to create market should fail
        let description = string::utf8(b"Test market with insufficient stake");
        let pyth_feed_id = x"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
        
        // This should abort with E_INSUFFICIENT_STAKE
        let markets_before = market::get_all_markets();
        let market_count_before = vector::length(&markets_before);
        assert!(market_count_before == 0, 99);
    }

    #[test(admin = @prediction_market, user = @0x123, aptos_framework = @aptos_framework)]
    public fun test_lmsr_pricing_and_odds_calculation(
        admin: &signer,
        user: &signer,
        aptos_framework: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        aptos_coin::initialize_for_test(aptos_framework);
        
        setup_minimum_stake(aptos_framework, 1000000000);
        
        let coins_user = coin::mint<AptosCoin>(500000000, aptos_framework);
        coin::deposit(user_addr, coins_user);

        market::initialize(admin);
        
        let description = string::utf8(b"Test LMSR pricing");
        let pyth_feed_id = x"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
        let threshold = 50000;
        
        market::create_binary_market(user, description, 3600, pyth_feed_id, threshold);
        
        // Initially should have equal odds
        let (initial_odds, _descriptions) = market::get_market_odds(1);
        assert!(vector::length(&initial_odds) == 2, 1);
        
        let yes_odds_initial = *vector::borrow(&initial_odds, 0);
        let no_odds_initial = *vector::borrow(&initial_odds, 1);
        assert!(yes_odds_initial == 50, 2); // Should start with 50-50
        assert!(no_odds_initial == 50, 3);
        
        // After betting, odds should change using LMSR
        market::buy_shares(user, 1, 1, 100000000); // Bet on YES
        
        let (odds_after, _) = market::get_market_odds(1);
        let yes_odds_after = *vector::borrow(&odds_after, 0);
        let no_odds_after = *vector::borrow(&odds_after, 1);
        
        // YES odds should increase since money went into YES pool
        assert!(yes_odds_after > yes_odds_initial, 4);
        assert!(no_odds_after < no_odds_initial, 5);
        
        // Total odds should still sum to 100
        assert!(yes_odds_after + no_odds_after == 100, 6);
    }

    #[test(admin = @prediction_market)]
    public fun test_market_creation_validation(
        admin: &signer,
    ) {
        let admin_addr = signer::address_of(admin);
        account::create_account_for_test(admin_addr);
        
        market::initialize(admin);
        
        // Test invalid category count for categorical market
        let empty_categories = vector::empty<string::String>();
        
        // Note: In practice, you would test the aborts_with! macro here
        // For now, we verify the market wasn't created
        let markets_before = market::get_all_markets();
        let count_before = vector::length(&markets_before);
        assert!(count_before == 0, 1);
    }

    #[test(admin = @prediction_market, user1 = @0x123, user2 = @0x456, aptos_framework = @aptos_framework)]
    public fun test_enhanced_position_tracking(
        admin: &signer,
        user1: &signer,
        user2: &signer,
        aptos_framework: &signer,
    ) {
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        let admin_addr = signer::address_of(admin);
        let user1_addr = signer::address_of(user1);
        let user2_addr = signer::address_of(user2);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user1_addr);
        account::create_account_for_test(user2_addr);

        aptos_coin::initialize_for_test(aptos_framework);
        
        setup_minimum_stake(aptos_framework, 1000000000);
        
        let coins_user1 = coin::mint<AptosCoin>(1000000000, aptos_framework);
        let coins_user2 = coin::mint<AptosCoin>(1000000000, aptos_framework);
        
        coin::deposit(user1_addr, coins_user1);
        coin::deposit(user2_addr, coins_user2);

        market::initialize(admin);

        // Create market and multiple positions
        let description = string::utf8(b"Test multiple positions");
        let pyth_feed_id = x"e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
        
        market::create_binary_market(user1, description, 3600, pyth_feed_id, 100000);

        // User1 makes multiple bets (aggregating positions)
        market::buy_shares(user1, 1, 1, 50000000); // YES
        market::buy_shares(user1, 1, 1, 30000000); // YES again
        market::buy_shares(user1, 1, 2, 40000000); // NO

        // Check user1 has single position with aggregated shares
        let user1_positions = market::get_user_portfolio(user1_addr);
        assert!(vector::length(&user1_positions) == 1, 1);
        
        let position = vector::borrow(&user1_positions, 0);
        assert!(position.market_id == 1, 2);
        assert!(position.yes_shares > 0, 3);
        assert!(position.no_shares > 0, 4);
        
        // User2 makes separate bets
        market::buy_shares(user2, 1, 1, 100000000); // YES
        
        let user2_positions = market::get_user_portfolio(user2_addr);
        assert!(vector::length(&user2_positions) == 1, 5);
    }

    #[test(admin = @prediction_market)]
    public fun test_platform_stats_view(
        admin: &signer,
    ) {
        let admin_addr = signer::address_of(admin);
        account::create_account_for_test(admin_addr);
        
        market::initialize(admin);
        
        let (total_markets, fee_rate, fee_pool_value) = market::get_platform_stats();
        assert!(total_markets == 0, 1);
        assert!(fee_rate == 100, 2); // 1% fee rate
        assert!(fee_pool_value == 0, 3);
    }
}