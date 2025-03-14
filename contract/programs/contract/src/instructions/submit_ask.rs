use std::cmp;

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::ErrorCode,
    events::{AskSubmitted, LoanIssued},
    states::{Ask, LendAuction, Loan, LoanPool, ShardPool},
    utils::{compute_shard_id, insert_sorted_ask, match_ask},
};

/// Submit a borrower ask with atomic matching
pub fn process_submit_ask(
    ctx: Context<SubmitAsk>,
    amount: u64,
    max_rate: u8,
    collateral: u64,
) -> Result<()> {
    let lend_auction = &mut ctx.accounts.lend_auction;
    let shard_pool = &mut ctx.accounts.shard_pool;
    let loan_pool = &mut ctx.accounts.loan_pool;
    let asker = &ctx.accounts.asker;

    // Validate inputs
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(collateral > 0, ErrorCode::InvalidCollateral);
    require!(shard_pool.asks.len() < 1000, ErrorCode::PoolFull);
    require!(
        lend_auction
            .supported_tokens
            .contains(&ctx.accounts.token_mint.key()),
        ErrorCode::UnsupportedToken
    );
    require!(
        lend_auction
            .supported_tokens
            .contains(&ctx.accounts.collateral_mint.key()),
        ErrorCode::UnsupportedCollateral
    );
    require_eq!(
        ctx.accounts.asker_collateral_account.mint,
        ctx.accounts.collateral_mint.key(),
        ErrorCode::InvalidTokenAccount
    );
    require_eq!(
        ctx.accounts.vault_collateral_account.mint,
        ctx.accounts.collateral_mint.key(),
        ErrorCode::InvalidVaultAccount
    );

    // Compute shard_id
    let shard_id = compute_shard_id(
        &ctx.accounts.token_mint.key(),
        max_rate,
        lend_auction.shard_count,
    );
    require_eq!(shard_pool.shard_id, shard_id, ErrorCode::ShardMismatch);
    require_eq!(loan_pool.shard_id, shard_id, ErrorCode::ShardMismatch);

    // Transfer collateral to vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.asker_collateral_account.to_account_info(),
                to: ctx.accounts.vault_collateral_account.to_account_info(),
                authority: asker.to_account_info(),
            },
        ),
        collateral,
    )?;

    let ask = Ask {
        borrower: asker.key(),
        amount,
        max_rate,
        collateral,
        slot: Clock::get()?.slot,
        token_mint: ctx.accounts.token_mint.key(),
        collateral_mint: ctx.accounts.collateral_mint.key(),
    };

    // Match ask with bids atomically
    let matches = match_ask(&ask, &mut shard_pool.bids)?;
    if !matches.is_empty() {
        let mut total_matched = 0;
        let mut loans = Vec::new();

        for (bid, rate) in matches {
            let loan_amount = cmp::min(ask.amount - total_matched, bid.amount);
            let loan_collateral = ask
                .collateral
                .checked_mul(loan_amount)
                .ok_or(ErrorCode::Overflow)?
                .checked_div(ask.amount)
                .ok_or(ErrorCode::Overflow)?;
            let loan = Loan {
                lender: bid.lender,
                borrower: ask.borrower,
                amount: loan_amount,
                rate,
                collateral: loan_collateral,
                repaid: false,
                shard_id,
                token_mint: ask.token_mint,
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
        require_eq!(total_matched, ask.amount, ErrorCode::PartialMatchNotAllowed);

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
        insert_sorted_ask(shard_pool, ask.clone());
        emit!(AskSubmitted {
            borrower: ask.borrower,
            amount,
            max_rate,
            shard_id,
            token_mint: ask.token_mint,
            collateral_mint: ask.collateral_mint,
        });
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(amount: u64, max_rate: u8, collateral: u64)]
pub struct SubmitAsk<'info> {
    #[account(mut, seeds = [b"lend_auction"], bump)]
    pub lend_auction: Account<'info, LendAuction>,
    #[account(
        init_if_needed,
        payer = asker,
        space = 8 + 8 + 1000 * (32 + 8 + 1 + 8 + 32 + 8) + 1000 * (32 + 8 + 1 + 8 + 8 + 32),
        seeds = [b"shard_pool", &compute_shard_id(&token_mint.key(), max_rate, lend_auction.shard_count).to_le_bytes()[..]], // Compute in function
        bump
    )]
    pub shard_pool: Account<'info, ShardPool>,
    #[account(
        init_if_needed,
        payer = asker,
        space = 8 + 8 + 1000 * (32 + 32 + 8 + 1 + 8 + 1 + 8 + 32 + 32 + 8 + 8),
        seeds = [b"loan_pool", &compute_shard_id(&token_mint.key(), max_rate, lend_auction.shard_count).to_le_bytes()[..]], // Compute in function
        bump
    )]
    pub loan_pool: Account<'info, LoanPool>,
    #[account(mut)]
    pub asker: Signer<'info>,
    #[account(mut, constraint = asker_collateral_account.owner == asker.key())]
    pub asker_collateral_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub borrower_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault", &compute_shard_id(&token_mint.key(), max_rate, lend_auction.shard_count).to_le_bytes()[..]], // Compute in function
        bump,
        constraint = vault_token_account.owner == lend_auction.key()
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault_collateral", &compute_shard_id(&token_mint.key(), max_rate, lend_auction.shard_count).to_le_bytes()[..]], // Compute in function
        bump,
        constraint = vault_collateral_account.owner == lend_auction.key()
    )]
    pub vault_collateral_account: Account<'info, TokenAccount>,
    pub token_mint: Box<Account<'info, Mint>>,
    pub collateral_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
