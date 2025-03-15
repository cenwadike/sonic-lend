use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

use crate::errors::ErrorCode;
use crate::events::FeesWithdrawn;
use crate::states::LendAuction;

/// Admin withdraws fees from a specific shard
pub fn process_withdraw_fees(ctx: Context<WithdrawFees>, shard_id: u64, amount: u64) -> Result<()> {
    let lend_auction = &ctx.accounts.lend_auction;
    let admin = &ctx.accounts.admin;

    require_eq!(lend_auction.admin, *admin.key, ErrorCode::Unauthorized);
    require!(shard_id < lend_auction.shard_count, ErrorCode::InvalidShard);
    require!(amount > 0, ErrorCode::InvalidAmount);
    require!(
        lend_auction.supported_tokens.contains(&ctx.accounts.token_mint.key()),
        ErrorCode::UnsupportedToken
    );
    require_eq!(
        ctx.accounts.fee_vault.mint,
        ctx.accounts.token_mint.key(),
        ErrorCode::InvalidVaultAccount
    );
    require_gte!(
        ctx.accounts.fee_vault.amount,
        amount,
        ErrorCode::InsufficientFunds
    );

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.fee_vault.to_account_info(),
                to: ctx.accounts.admin_token_account.to_account_info(),
                authority: lend_auction.to_account_info(),
            },
            &[&[b"lend_auction", &[ctx.bumps.lend_auction]]],
        ),
        amount,
    )?;

    emit!(FeesWithdrawn {
        admin: lend_auction.admin,
        shard_id,
        amount,
        token_mint: ctx.accounts.token_mint.key(),
    });
    Ok(())
}

#[derive(Accounts)]
#[instruction(shard_id: u64, amount: u64)]
pub struct WithdrawFees<'info> {
    #[account(mut, seeds = [b"lend_auction"], bump)]
    pub lend_auction: Account<'info, LendAuction>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        constraint = fee_vault.owner == lend_auction.key()
    )]
    pub fee_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = admin_token_account.owner == admin.key())]
    pub admin_token_account: Account<'info, TokenAccount>,
    pub token_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}
