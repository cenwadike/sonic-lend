use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::{
    errors::ErrorCode,
    events::LoanRepaid,
    states::{LendAuction, LoanPool}, utils::compute_shard_id,
};

/// Repay a loan
pub fn process_repay(ctx: Context<Repay>, loan_idx: u64, rate: u8) -> Result<()> {
    let _ = rate;
    let loan_pool = &mut ctx.accounts.loan_pool;
    let lend_auction = &ctx.accounts.lend_auction;

    require!(
        loan_idx < loan_pool.loans.len() as u64,
        ErrorCode::InvalidLoanIndex
    );
    let loan = &mut loan_pool.loans[loan_idx as usize];

    require!(!loan.repaid, ErrorCode::AlreadyRepaid);
    require_eq!(
        loan.borrower,
        *ctx.accounts.borrower.key,
        ErrorCode::Unauthorized
    );
    require!(
        lend_auction.supported_tokens.contains(&loan.token_mint),
        ErrorCode::UnsupportedToken
    );
    require_eq!(
        ctx.accounts.borrower_token_account.mint,
        loan.token_mint,
        ErrorCode::InvalidRepaymentToken
    );
    require_eq!(
        ctx.accounts.lender_token_account.mint,
        loan.token_mint,
        ErrorCode::InvalidTokenAccount
    );
    require_eq!(
        ctx.accounts.vault_collateral_account.mint,
        loan.collateral_mint,
        ErrorCode::InvalidVaultAccount
    );

    let current_slot = Clock::get()?.slot;
    let elapsed_slots = current_slot.saturating_sub(loan.start_slot);
    let interest_factor = (elapsed_slots as u128)
        .checked_mul(loan.rate as u128)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(
            (loan.duration_slots as u128)
                .checked_mul(100)
                .ok_or(ErrorCode::Overflow)?,
        )
        .ok_or(ErrorCode::Overflow)?;
    let repayment = loan
        .amount
        .checked_add(
            (loan.amount as u128)
                .checked_mul(interest_factor)
                .ok_or(ErrorCode::Overflow)? as u64,
        )
        .ok_or(ErrorCode::Overflow)?;

    transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.borrower_token_account.to_account_info(),
                to: ctx.accounts.lender_token_account.to_account_info(),
                authority: ctx.accounts.borrower.to_account_info(),
            },
        ),
        repayment,
    )?;

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_collateral_account.to_account_info(),
                to: ctx.accounts.borrower_collateral_account.to_account_info(),
                authority: lend_auction.to_account_info(),
            },
            &[&[b"lend_auction", &[ctx.bumps.lend_auction]]],
        ),
        loan.collateral,
    )?;

    loan.repaid = true;
    emit!(LoanRepaid {
        lender: loan.lender,
        borrower: loan.borrower,
        amount: repayment,
        shard_id: loan.shard_id,
        token_mint: loan.token_mint,
        collateral_mint: loan.collateral_mint,
    });
    Ok(())
}
#[derive(Accounts)]
#[instruction(loan_idx: u64, rate: u8)]
pub struct Repay<'info> {
    #[account(mut, seeds = [b"lend_auction"], bump)]
    pub lend_auction: Account<'info, LendAuction>,
    #[account(mut, seeds = [b"loan_pool",  &compute_shard_id(&token_mint.key(), rate, lend_auction.shard_count).to_le_bytes()[..]], bump)]
    pub loan_pool: Account<'info, LoanPool>,
    #[account(mut)]
    pub borrower: Signer<'info>,
    #[account(mut, constraint = borrower_token_account.owner == borrower.key())]
    pub borrower_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = borrower_collateral_account.owner == borrower.key())]
    pub borrower_collateral_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lender_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_collateral_account.owner == lend_auction.key()
    )]
    pub vault_collateral_account: Account<'info, TokenAccount>,
    pub token_mint: Box<Account<'info, Mint>>,
    pub token_program: Program<'info, Token>,
}
