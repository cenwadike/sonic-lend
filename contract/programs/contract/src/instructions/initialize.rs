use crate::errors::ErrorCode;
use crate::events::AuctionInitialized;
use crate::states::LendAuction;
use anchor_lang::prelude::*;

/// Initialize the global auction with supported tokens and shard count
pub fn process_initialize(
    ctx: Context<Initialize>,
    shard_count: u64,
    supported_tokens: Vec<Pubkey>,
) -> Result<()> {
    require!(shard_count > 0, ErrorCode::InvalidShardCount);
    require!(!supported_tokens.is_empty(), ErrorCode::NoSupportedTokens);

    let lend_auction = &mut ctx.accounts.lend_auction;
    lend_auction.admin = *ctx.accounts.admin.key;
    lend_auction.shard_count = shard_count;
    lend_auction.total_loans = 0;
    lend_auction.supported_tokens = supported_tokens.clone();

    emit!(AuctionInitialized {
        admin: lend_auction.admin,
        shard_count,
        supported_tokens,
    });
    Ok(())
}

#[derive(Accounts)]
#[instruction(shard_count: u64, supported_tokens: Vec<Pubkey>)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 8 + 8 + 32 * supported_tokens.len(),
        seeds = [b"lend_auction"],
        bump
    )]
    pub lend_auction: Account<'info, LendAuction>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}
