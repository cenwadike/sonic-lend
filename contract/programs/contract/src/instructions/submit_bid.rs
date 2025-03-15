use std::cmp;

use crate::{
    errors::ErrorCode,
    events::{BidSubmitted, LoanIssued},
    states::{Bid, LendAuction, Loan, LoanPool, ShardPool},
    utils::{compute_shard_id, insert_sorted_bid, match_bid},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

/// Submit a lender bid with automatic shard routing
pub fn process_submit_bid(
    ctx: Context<SubmitBid>,
    amount: u64,
    min_rate: u8,
    duration_slots: u64,
) -> Result<()> {
    let lend_auction = &mut ctx.accounts.lend_auction;
    let shard_pool = &mut ctx.accounts.shard_pool;
    let loan_pool = &mut ctx.accounts.loan_pool;
    let bidder = &ctx.accounts.bidder;

    // Validate inputs
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(duration_slots > 0, ErrorCode::InvalidDuration);
    require!(shard_pool.bids.len() < 10, ErrorCode::PoolFull);
    require!(
        lend_auction
            .supported_tokens
            .contains(&ctx.accounts.token_mint.key()),
        ErrorCode::UnsupportedToken
    );
    require_eq!(
        ctx.accounts.bidder_token_account.mint,
        ctx.accounts.token_mint.key(),
        ErrorCode::InvalidTokenAccount
    );
    require_eq!(
        ctx.accounts.vault_token_account.mint,
        ctx.accounts.token_mint.key(),
        ErrorCode::InvalidVaultAccount
    );

    // Compute shard_id
    let shard_id = compute_shard_id(
        &ctx.accounts.token_mint.key(),
        min_rate,
        lend_auction.shard_count,
    );
    require_eq!(shard_pool.shard_id, shard_id, ErrorCode::ShardMismatch);
    require_eq!(loan_pool.shard_id, shard_id, ErrorCode::ShardMismatch);

    // Transfer loan tokens to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.bidder_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: bidder.to_account_info(),
            },
        ),
        amount,
    )?;

    let bid = Bid {
        lender: bidder.key(),
        amount,
        min_rate,
        slot: Clock::get()?.slot,
        token_mint: ctx.accounts.token_mint.key(),
        duration_slots,
    };

    // Match bid with asks atomically
    let matches = match_bid(&bid, &mut shard_pool.asks)?;
    if !matches.is_empty() {
        let mut total_matched = 0;
        let mut loans = Vec::new();

        for (ask, rate) in matches {
            let loan_amount = cmp::min(bid.amount - total_matched, ask.amount);
            let loan = Loan {
                lender: bid.lender,
                borrower: ask.borrower,
                amount: loan_amount,
                rate,
                collateral: ask.collateral,
                repaid: false,
                shard_id,
                token_mint: bid.token_mint,
                collateral_mint: ask.collateral_mint,
                start_slot: Clock::get()?.slot,
                duration_slots: bid.duration_slots,
            };

            // Validate collateral ratio
            require_gte!(
                loan.collateral,
                loan.amount
                    .checked_mul(15)
                    .ok_or(ErrorCode::Overflow)?
                    .checked_div(10)
                    .ok_or(ErrorCode::Overflow)?,
                ErrorCode::InsufficientCollateral
            );

            total_matched = total_matched
                .checked_add(loan.amount)
                .ok_or(ErrorCode::Overflow)?;
            loans.push(loan);
        }

        // Require full match for atomicity
        require_eq!(total_matched, bid.amount, ErrorCode::PartialMatchNotAllowed);

        // Process all transfers and store loans
        for loan in &loans {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.vault_token_account.to_account_info(),
                        to: ctx.accounts.borrower_token_account.to_account_info(),
                        authority: lend_auction.to_account_info(),
                    },
                    &[&[b"lend_auction", &[ctx.bumps.lend_auction]]],
                ),
                loan.amount,
            )?;

            lend_auction.total_loans = lend_auction
                .total_loans
                .checked_add(1)
                .ok_or(ErrorCode::Overflow)?;
            loan_pool.loans.push(loan.clone());

            emit!(LoanIssued {
                lender: loan.lender,
                borrower: loan.borrower,
                amount: loan.amount,
                rate: loan.rate,
                shard_id,
                token_mint: loan.token_mint,
                collateral_mint: loan.collateral_mint,
            });
        }
    } else {
        insert_sorted_bid(shard_pool, bid.clone());
        emit!(BidSubmitted {
            lender: bid.lender,
            amount,
            min_rate,
            shard_id,
            token_mint: bid.token_mint,
        });
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64, min_rate: u8, duration_slots: u64)]
pub struct SubmitBid<'info> {
    #[account(mut, seeds = [b"lend_auction"], bump)]
    pub lend_auction: Box<Account<'info, LendAuction>>,
    #[account(
        init_if_needed,
        payer = bidder,
        space = 8 + 8 + 10 * (32 + 8 + 1 + 8 + 32 + 8) + 10 * (32 + 8 + 1 + 8 + 8 + 32),
        seeds = [b"shard_pool", &compute_shard_id(&token_mint.key(), min_rate, lend_auction.shard_count).to_le_bytes()[..]], // Compute in function
        bump
    )]
    pub shard_pool: Box<Account<'info, ShardPool>>,
    #[account(
        init_if_needed,
        payer = bidder,
        space = 8 + 8 + 10 * (32 + 32 + 8 + 1 + 8 + 1 + 8 + 32 + 32 + 8 + 8),
        seeds = [b"loan_pool", &compute_shard_id(&token_mint.key(), min_rate, lend_auction.shard_count).to_le_bytes()[..]], // Compute in function
        bump
    )]
    pub loan_pool: Box<Account<'info, LoanPool>>,
    #[account(mut)]
    pub bidder: Signer<'info>,
    #[account(mut, constraint = bidder_token_account.owner == bidder.key())]
    pub bidder_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub borrower_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = vault_token_account.owner == lend_auction.key()
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    pub token_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
