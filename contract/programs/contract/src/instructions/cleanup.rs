use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

use crate::errors::ErrorCode;
use crate::events::{AskExpired, BidExpired};
use crate::states::{LendAuction, ShardPool};

/// Cleanup stale bids/asks with refunds and 0.5% fee
pub fn process_cleanup(ctx: Context<Cleanup>, shard_id: u64) -> Result<()> {
    let shard_pool = &mut ctx.accounts.shard_pool;
    let lend_auction = &ctx.accounts.lend_auction;

    require!(shard_id < lend_auction.shard_count, ErrorCode::InvalidShard);
    require_eq!(shard_pool.shard_id, shard_id, ErrorCode::ShardMismatch);

    let current_slot = Clock::get()?.slot;
    let stale_threshold = current_slot.saturating_sub(216000); // ~24 hrs

    let mut refunded_bids = Vec::new();
    let mut refunded_asks = Vec::new();

    shard_pool.bids.retain(|bid| {
        if bid.slot <= stale_threshold {
            refunded_bids.push(bid.clone());
            false
        } else {
            true
        }
    });

    shard_pool.asks.retain(|ask| {
        if ask.slot <= stale_threshold {
            refunded_asks.push(ask.clone());
            false
        } else {
            true
        }
    });

    for bid in refunded_bids {
        let refund_amount = bid
            .amount
            .checked_mul(995) // Refund is 99.5% of the original amount
            .ok_or(ErrorCode::Overflow)?
            .checked_div(1000)
            .ok_or(ErrorCode::Overflow)?;

        let fee_amount = bid
            .amount
            .checked_mul(5) // Fee is 0.5% of the original amount
            .ok_or(ErrorCode::Overflow)?
            .checked_div(1000)
            .ok_or(ErrorCode::Overflow)?;

        require_eq!(
            refund_amount + fee_amount,
            bid.amount,
            ErrorCode::InvalidAmount
        );

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.bidder_token_account.to_account_info(),
                    authority: lend_auction.to_account_info(),
                },
                &[&[b"lend_auction", &[ctx.bumps.lend_auction]]],
            ),
            refund_amount,
        )?;

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.fee_vault.to_account_info(),
                    authority: lend_auction.to_account_info(),
                },
                &[&[b"lend_auction", &[ctx.bumps.lend_auction]]],
            ),
            fee_amount,
        )?;

        emit!(BidExpired {
            lender: bid.lender,
            amount: bid.amount,
            refund_amount,
            fee_amount,
            shard_id,
            token_mint: bid.token_mint,
        });
    }

    for ask in refunded_asks {
        let refund_amount = ask
            .collateral
            .checked_mul(995)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(1000)
            .ok_or(ErrorCode::Overflow)?;
        let fee_amount = ask
            .collateral
            .checked_mul(5)
            .ok_or(ErrorCode::Overflow)?
            .checked_div(1000)
            .ok_or(ErrorCode::Overflow)?;

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_collateral_account.to_account_info(),
                    to: ctx.accounts.asker_collateral_account.to_account_info(),
                    authority: lend_auction.to_account_info(),
                },
                &[&[b"lend_auction", &[ctx.bumps.lend_auction]]],
            ),
            refund_amount,
        )?;
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault_collateral_account.to_account_info(),
                    to: ctx.accounts.fee_vault_collateral.to_account_info(),
                    authority: lend_auction.to_account_info(),
                },
                &[&[b"lend_auction", &[ctx.bumps.lend_auction]]],
            ),
            fee_amount,
        )?;

        emit!(AskExpired {
            borrower: ask.borrower,
            amount: ask.amount,
            refund_amount,
            fee_amount,
            shard_id,
            token_mint: ask.token_mint,
            collateral_mint: ask.collateral_mint,
        });
    }

    Ok(())
}

#[derive(Accounts)]
#[instruction(shard_id: u64)]
pub struct Cleanup<'info> {
    #[account(mut, seeds = [b"lend_auction"], bump)]
    pub lend_auction: Account<'info, LendAuction>,
    #[account(mut, seeds = [b"shard_pool", shard_id.to_le_bytes().as_ref()], bump)]
    pub shard_pool: Account<'info, ShardPool>,
    #[account(mut)]
    pub bidder_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub asker_collateral_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_token_account.owner == lend_auction.key()
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = vault_collateral_account.owner == lend_auction.key()
    )]
    pub vault_collateral_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = fee_vault.owner == lend_auction.key()
    )]
    pub fee_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = fee_vault_collateral.owner == lend_auction.key())]
    pub fee_vault_collateral: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}
