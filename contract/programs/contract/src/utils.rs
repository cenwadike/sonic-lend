use std::cmp;

use anchor_lang::prelude::*;

use crate::errors::ErrorCode;
use crate::states::{Ask, Bid, ShardPool};

/// Compute shard ID based on token_mint and rate
pub fn compute_shard_id(token_mint: &Pubkey, rate: u8, shard_count: u64) -> u64 {
    let mut hasher = anchor_lang::solana_program::hash::Hasher::default();
    hasher.hash(&token_mint.to_bytes());
    hasher.hash(&[rate]);
    let hash = hasher.result();
    let bytes = hash.to_bytes();
    // Construct a [u8; 8] array explicitly from the first 8 bytes
    let shard_bytes = [
        bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7],
    ];
    u64::from_le_bytes(shard_bytes) % shard_count
}

/// Match a bid against sorted asks atomically, with a 5% rate difference limit
pub fn match_bid(bid: &Bid, asks: &mut Vec<Ask>) -> Result<Vec<(Ask, u8)>> {
    if asks.is_empty() {
        msg!("No asks available");
        return Ok(Vec::new());
    }

    let mut matches = Vec::new();
    let mut remaining_amount = bid.amount;

    msg!("Bid: min_rate={}, amount={}", bid.min_rate, bid.amount);
    for (i, ask) in asks.iter().enumerate() {
        msg!(
            "Ask[{}]: max_rate={}, amount={}",
            i,
            ask.max_rate,
            ask.amount
        );
    }

    let mut i = 0;
    while i < asks.len() && remaining_amount > 0 {
        let ask = &asks[i];
        if ask.max_rate >= bid.min_rate && ask.token_mint == bid.token_mint {
            let rate_diff = if ask.max_rate > bid.min_rate {
                ask.max_rate - bid.min_rate
            } else {
                bid.min_rate - ask.max_rate
            };
            msg!("Ask[{}] rate_diff: {}", i, rate_diff);

            if rate_diff <= 5 {
                let match_amount = cmp::min(remaining_amount, ask.amount);
                let rate = cmp::min((bid.min_rate + ask.max_rate) / 2, ask.max_rate);
                msg!("Matching: amount={}, rate={}", match_amount, rate);

                let matched_ask = asks.remove(i);
                matches.push((
                    Ask {
                        amount: match_amount,
                        ..matched_ask
                    },
                    rate,
                ));
                remaining_amount = remaining_amount
                    .checked_sub(match_amount)
                    .ok_or(ErrorCode::Overflow)?;
                continue;
            }
        }
        i += 1;
    }

    msg!("Total matches: {}", matches.len());
    Ok(matches)
}

/// Match an ask against sorted bids atomically, with a 5% rate difference limit
pub fn match_ask(ask: &Ask, bids: &mut Vec<Bid>) -> Result<Vec<(Bid, u8)>> {
    if bids.is_empty() {
        msg!("No bids available");
        return Ok(Vec::new());
    }

    let mut matches = Vec::new();
    let mut remaining_amount = ask.amount;

    msg!("Ask: max_rate={}, amount={}", ask.max_rate, ask.amount);
    for (i, bid) in bids.iter().enumerate() {
        msg!(
            "Bid[{}]: min_rate={}, amount={}",
            i,
            bid.min_rate,
            bid.amount
        );
    }

    let mut i = 0;
    while i < bids.len() && remaining_amount > 0 {
        let bid = &bids[i];
        if bid.min_rate <= ask.max_rate && bid.token_mint == ask.token_mint {
            let rate_diff = if bid.min_rate > ask.max_rate {
                bid.min_rate - ask.max_rate
            } else {
                ask.max_rate - bid.min_rate
            };
            msg!("Bid[{}] rate_diff: {}", i, rate_diff);

            if rate_diff <= 5 {
                let match_amount = cmp::min(remaining_amount, bid.amount);
                let rate = cmp::min((bid.min_rate + ask.max_rate) / 2, ask.max_rate);
                msg!("Matching: amount={}, rate={}", match_amount, rate);

                let matched_bid = bids.remove(i);
                matches.push((
                    Bid {
                        amount: match_amount,
                        ..matched_bid
                    },
                    rate,
                ));
                remaining_amount = remaining_amount
                    .checked_sub(match_amount)
                    .ok_or(ErrorCode::Overflow)?;
                continue;
            }
        }
        i += 1;
    }

    msg!("Total matches: {}", matches.len());
    Ok(matches)
}
/// Insert bid into sorted Vec (ascending by min_rate)
pub fn insert_sorted_bid(shard_pool: &mut ShardPool, bid: Bid) {
    let idx = shard_pool
        .bids
        .binary_search_by(|b| b.min_rate.cmp(&bid.min_rate))
        .unwrap_or_else(|e| e);
    shard_pool.bids.insert(idx, bid);
}

/// Insert ask into sorted Vec (descending by max_rate)
pub fn insert_sorted_ask(shard_pool: &mut ShardPool, ask: Ask) {
    let idx = shard_pool
        .asks
        .binary_search_by(|a| ask.max_rate.cmp(&a.max_rate))
        .unwrap_or_else(|e| e);
    shard_pool.asks.insert(idx, ask);
}

/// Create Raydium swap instruction (simplified for SwapBaseIn)
pub fn create_raydium_swap_instruction(
    program_id: &AccountInfo,
    amm: &AccountInfo,
    amm_authority: &AccountInfo,
    amm_open_orders: &AccountInfo,
    amm_coin_vault: &AccountInfo,
    amm_pc_vault: &AccountInfo,
    market_program: &AccountInfo,
    market: &AccountInfo,
    market_bids: &AccountInfo,
    market_asks: &AccountInfo,
    market_event_queue: &AccountInfo,
    market_coin_vault: &AccountInfo,
    market_pc_vault: &AccountInfo,
    market_vault_signer: &AccountInfo,
    user_token_source: &AccountInfo,
    user_token_destination: &AccountInfo,
    user_source_owner: &AccountInfo,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<anchor_lang::solana_program::instruction::Instruction> {
    let data = vec![
        vec![9u8], // Raydium SwapBaseIn instruction ID (based on Raydium's layout)
        amount_in.to_le_bytes().to_vec(),
        minimum_amount_out.to_le_bytes().to_vec(),
    ]
    .concat();

    Ok(anchor_lang::solana_program::instruction::Instruction {
        program_id: *program_id.key,
        accounts: vec![
            AccountMeta::new(*amm.key, false),
            AccountMeta::new_readonly(*amm_authority.key, false),
            AccountMeta::new(*amm_open_orders.key, false),
            AccountMeta::new(*amm_coin_vault.key, false),
            AccountMeta::new(*amm_pc_vault.key, false),
            AccountMeta::new_readonly(*market_program.key, false),
            AccountMeta::new(*market.key, false),
            AccountMeta::new(*market_bids.key, false),
            AccountMeta::new(*market_asks.key, false),
            AccountMeta::new(*market_event_queue.key, false),
            AccountMeta::new(*market_coin_vault.key, false),
            AccountMeta::new(*market_pc_vault.key, false),
            AccountMeta::new_readonly(*market_vault_signer.key, false),
            AccountMeta::new(*user_token_source.key, false),
            AccountMeta::new(*user_token_destination.key, false),
            AccountMeta::new(*user_source_owner.key, true),
            AccountMeta::new_readonly(anchor_spl::token::ID, false),
        ],
        data,
    })
}
