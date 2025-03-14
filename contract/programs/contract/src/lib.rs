#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

mod instructions;
use instructions::*;

mod errors;
mod events;
mod states;
mod utils;

declare_id!("EDvhvdnYVX2JsuAXvJXvBN3jd79ceNYMMnw11JSvzCPo");

pub const RAYDIUM_AMM_PROGRAM: &str = "RAYDIUM_AMM_PROGRAM_ID";

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        shard_count: u64,
        supported_tokens: Vec<Pubkey>,
    ) -> Result<()> {
        process_initialize(ctx, shard_count, supported_tokens)
    }

    pub fn submit_bid(
        ctx: Context<SubmitBid>,
        amount: u64,
        min_rate: u8,
        duration_slots: u64,
    ) -> Result<()> {
        process_submit_bid(ctx, amount, min_rate, duration_slots)
    }

    pub fn submit_ask(
        ctx: Context<SubmitAsk>,
        amount: u64,
        max_rate: u8,
        collateral: u64,
    ) -> Result<()> {
        process_submit_ask(ctx, amount, max_rate, collateral)
    }

    pub fn repay(ctx: Context<Repay>, loan_idx: u64) -> Result<()> {
        process_repay(ctx, loan_idx)
    }

    pub fn liquidate(
        ctx: Context<Liquidate>,
        loan_idx: u64,
        minimum_amount_out: u64,
    ) -> Result<()> {
        process_liquidate(ctx, loan_idx, minimum_amount_out)
    }

    pub fn withdraw_fees(ctx: Context<WithdrawFees>, shard_id: u64, amount: u64) -> Result<()> {
        process_withdraw_fees(ctx, shard_id, amount)
    }

    pub fn cleanup(ctx: Context<Cleanup>, shard_id: u64) -> Result<()> {
        process_cleanup(ctx, shard_id)
    }
}
