use std::str::FromStr;

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::utils::create_raydium_swap_instruction;
use crate::{
    errors::ErrorCode,
    events::LoanLiquidated,
    states::{LendAuction, LoanPool},
    RAYDIUM_AMM_PROGRAM,
};

/// Liquidate an unhealthy loan by swapping collateral on Raydium
pub fn process_liquidate(
    ctx: Context<Liquidate>,
    loan_idx: u64,
    minimum_amount_out: u64,
) -> Result<()> {
    let loan_pool = &mut ctx.accounts.loan_pool;
    let lend_auction = &ctx.accounts.lend_auction;

    require!(
        loan_idx < loan_pool.loans.len() as u64,
        ErrorCode::InvalidLoanIndex
    );
    let loan = &mut loan_pool.loans[loan_idx as usize];

    require!(!loan.repaid, ErrorCode::AlreadyRepaid);
    require!(
        lend_auction.supported_tokens.contains(&loan.token_mint),
        ErrorCode::UnsupportedToken
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
    require_eq!(
        ctx.accounts.liquidator_token_account.mint,
        loan.token_mint,
        ErrorCode::InvalidTokenAccount
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

    let health_factor = (loan.collateral as u128)
        .checked_mul(100)
        .ok_or(ErrorCode::Overflow)?
        .checked_div(repayment as u128)
        .ok_or(ErrorCode::Overflow)?;
    require!(health_factor <= 120, ErrorCode::LoanNotUnhealthy);

    // Perform Raydium swap: collateral -> loan token
    let swap_instruction = create_raydium_swap_instruction(
        &ctx.accounts.raydium_amm_program,
        &ctx.accounts.amm,
        &ctx.accounts.amm_authority,
        &ctx.accounts.amm_open_orders,
        &ctx.accounts.amm_coin_vault,
        &ctx.accounts.amm_pc_vault,
        &ctx.accounts.market_program,
        &ctx.accounts.market,
        &ctx.accounts.market_bids,
        &ctx.accounts.market_asks,
        &ctx.accounts.market_event_queue,
        &ctx.accounts.market_coin_vault,
        &ctx.accounts.market_pc_vault,
        &ctx.accounts.market_vault_signer,
        &ctx.accounts.vault_collateral_account.to_account_info(), // Source: collateral
        &ctx.accounts.liquidator_token_account.to_account_info(), // Destination: loan token
        &lend_auction.to_account_info(),                          // Authority
        loan.collateral,
        minimum_amount_out,
    )?;

    anchor_lang::solana_program::program::invoke_signed(
        &swap_instruction,
        &[
            ctx.accounts.raydium_amm_program.to_account_info(),
            ctx.accounts.amm.to_account_info(),
            ctx.accounts.amm_authority.to_account_info(),
            ctx.accounts.amm_open_orders.to_account_info(),
            ctx.accounts.amm_coin_vault.to_account_info(),
            ctx.accounts.amm_pc_vault.to_account_info(),
            ctx.accounts.market_program.to_account_info(),
            ctx.accounts.market.to_account_info(),
            ctx.accounts.market_bids.to_account_info(),
            ctx.accounts.market_asks.to_account_info(),
            ctx.accounts.market_event_queue.to_account_info(),
            ctx.accounts.market_coin_vault.to_account_info(),
            ctx.accounts.market_pc_vault.to_account_info(),
            ctx.accounts.market_vault_signer.to_account_info(),
            ctx.accounts.vault_collateral_account.to_account_info(),
            ctx.accounts.liquidator_token_account.to_account_info(),
            ctx.accounts.lend_auction.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        ],
        &[&[b"lend_auction", &[ctx.bumps.lend_auction]]],
    )?;

    // Distribute proceeds
    let proceeds = ctx.accounts.liquidator_token_account.amount;
    require_gte!(proceeds, repayment, ErrorCode::InsufficientSwapProceeds);

    // Transfer repayment (capital + interest) to lender
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.liquidator_token_account.to_account_info(),
                to: ctx.accounts.lender_token_account.to_account_info(),
                authority: ctx.accounts.liquidator.to_account_info(),
            },
        ),
        repayment,
    )?;

    let liquidator_profit = proceeds.checked_sub(repayment).ok_or(ErrorCode::Overflow)?;

    loan.repaid = true;
    emit!(LoanLiquidated {
        lender: loan.lender,
        borrower: loan.borrower,
        liquidator: ctx.accounts.liquidator.key(),
        amount: repayment,
        collateral: loan.collateral,
        profit: liquidator_profit,
        shard_id: loan.shard_id,
        token_mint: loan.token_mint,
        collateral_mint: loan.collateral_mint,
    });

    Ok(())
}
#[derive(Accounts)]
#[instruction(loan_idx: u64, minimum_amount_out: u64)]
pub struct Liquidate<'info> {
    #[account(mut, seeds = [b"lend_auction"], bump)]
    pub lend_auction: Account<'info, LendAuction>,
    #[account(mut, seeds = [b"loan_pool", loan_pool.shard_id.to_le_bytes().as_ref()], bump)]
    pub loan_pool: Account<'info, LoanPool>,
    #[account(mut)]
    pub liquidator: Signer<'info>,
    #[account(mut, constraint = liquidator_token_account.owner == liquidator.key())]
    pub liquidator_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub lender_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"vault_collateral", loan_pool.shard_id.to_le_bytes().as_ref()],
        bump,
        constraint = vault_collateral_account.owner == lend_auction.key()
    )]
    pub vault_collateral_account: Account<'info, TokenAccount>,
    /// CHECK: Raydium AMM Program
    #[account(constraint = raydium_amm_program.key() == Pubkey::from_str(RAYDIUM_AMM_PROGRAM).unwrap())]
    pub raydium_amm_program: UncheckedAccount<'info>,
    /// CHECK: AMM account
    #[account(mut)]
    pub amm: UncheckedAccount<'info>,
    /// CHECK: AMM authority
    pub amm_authority: UncheckedAccount<'info>,
    /// CHECK: AMM open orders
    #[account(mut)]
    pub amm_open_orders: UncheckedAccount<'info>,
    /// CHECK: AMM coin vault (collateral)
    #[account(mut)]
    pub amm_coin_vault: UncheckedAccount<'info>,
    /// CHECK: AMM pc vault (loan token)
    #[account(mut)]
    pub amm_pc_vault: UncheckedAccount<'info>,
    /// CHECK: Market program
    pub market_program: UncheckedAccount<'info>,
    /// CHECK: Market account
    #[account(mut)]
    pub market: UncheckedAccount<'info>,
    /// CHECK: Market bids
    #[account(mut)]
    pub market_bids: UncheckedAccount<'info>,
    /// CHECK: Market asks
    #[account(mut)]
    pub market_asks: UncheckedAccount<'info>,
    /// CHECK: Market event queue
    #[account(mut)]
    pub market_event_queue: UncheckedAccount<'info>,
    /// CHECK: Market coin vault
    #[account(mut)]
    pub market_coin_vault: UncheckedAccount<'info>,
    /// CHECK: Market pc vault
    #[account(mut)]
    pub market_pc_vault: UncheckedAccount<'info>,
    /// CHECK: Market vault signer
    pub market_vault_signer: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}
