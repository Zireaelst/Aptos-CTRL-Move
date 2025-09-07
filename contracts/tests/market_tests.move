#[test_only]
module prediction_market::market_tests {
    use std::string;
    use std::signer;
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::account;
    use prediction_market::market;

    #[test(admin = @prediction_market, user1 = @0x123, user2 = @0x456, aptos_framework = @aptos_framework)]
    public fun test_full_market_cycle(
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

        // Initialize accounts with APT
        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user1_addr);
        account::create_account_for_test(user2_addr);

        // Initialize AptosCoin
        aptos_coin::initialize_for_test(aptos_framework);
        
        // Mint some coins for testing
        let coins_admin = coin::mint<AptosCoin>(10000, aptos_framework);
        let coins_user1 = coin::mint<AptosCoin>(1000, aptos_framework);
        let coins_user2 = coin::mint<AptosCoin>(1000, aptos_framework);
        
        coin::deposit(admin_addr, coins_admin);
        coin::deposit(user1_addr, coins_user1);
        coin::deposit(user2_addr, coins_user2);

        // Initialize prediction market
        market::initialize(admin);

        // Create a market
        let description = string::utf8(b"Will BTC reach $100,000 by end of year?");
        market::create_market(admin, description, 86400); // 24 hours

        // Users buy shares
        market::buy_shares(user1, 1, 1, 100); // User1 bets 100 APT on YES
        market::buy_shares(user2, 1, 2, 200); // User2 bets 200 APT on NO

        // Check market state
        let market_data = market::get_market(1);
        assert!(market_data.yes_pool > 0, 1);
        assert!(market_data.no_pool > 0, 2);

        // Check user portfolios
        let user1_positions = market::get_user_portfolio(user1_addr);
        let user2_positions = market::get_user_portfolio(user2_addr);
        assert!(std::vector::length(&user1_positions) == 1, 3);
        assert!(std::vector::length(&user2_positions) == 1, 4);

        // Fast forward past market end time
        timestamp::fast_forward_seconds(86500);

        // Resolve market (YES wins)
        market::resolve_market(admin, 1, 1);

        // User1 claims winnings
        market::claim_winnings(user1);

        // Check that user1 received winnings
        let final_balance = coin::balance<AptosCoin>(user1_addr);
        assert!(final_balance > 900, 5); // Should have more than initial after fees
    }

    #[test(admin = @prediction_market)]
    public fun test_market_creation(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        account::create_account_for_test(admin_addr);
        
        market::initialize(admin);
        
        let description = string::utf8(b"Test market");
        market::create_market(admin, description, 3600);
        
        let markets = market::get_all_markets();
        assert!(std::vector::length(&markets) == 1, 1);
        
        let market_data = market::get_market(1);
        assert!(market_data.id == 1, 2);
        assert!(!market_data.is_resolved, 3);
    }

    #[test(admin = @prediction_market, user = @0x123, aptos_framework = @aptos_framework)]
    public fun test_odds_calculation(
        admin: &signer,
        user: &signer,
        aptos_framework: &signer,
    ) {
        // Setup
        timestamp::set_time_has_started_for_testing(aptos_framework);
        
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        account::create_account_for_test(admin_addr);
        account::create_account_for_test(user_addr);

        aptos_coin::initialize_for_test(aptos_framework);
        
        let coins_admin = coin::mint<AptosCoin>(10000, aptos_framework);
        let coins_user = coin::mint<AptosCoin>(1000, aptos_framework);
        
        coin::deposit(admin_addr, coins_admin);
        coin::deposit(user_addr, coins_user);

        market::initialize(admin);
        
        let description = string::utf8(b"Test odds");
        market::create_market(admin, description, 3600);
        
        // Initially should be 50-50
        let (yes_odds, no_odds) = market::get_market_odds(1);
        assert!(yes_odds == 50, 1);
        assert!(no_odds == 50, 2);
        
        // After betting, odds should change
        market::buy_shares(user, 1, 1, 100);
        let (yes_odds_after, no_odds_after) = market::get_market_odds(1);
        
        // YES odds should increase since money went into YES pool
        assert!(yes_odds_after > 50, 3);
        assert!(no_odds_after < 50, 4);
    }
}
