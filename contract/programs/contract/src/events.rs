use anchor_lang::prelude::*;

// Events
#[event]
pub struct AuctionInitialized {
    pub admin: Pubkey,
    pub shard_count: u64,
    pub supported_tokens: Vec<Pubkey>,
}

#[event]
pub struct BidSubmitted {
    pub lender: Pubkey,
    pub amount: u64,
    pub min_rate: u8,
    pub shard_id: u64,
    pub token_mint: Pubkey,
}

#[event]
pub struct AskSubmitted {
    pub borrower: Pubkey,
    pub amount: u64,
    pub max_rate: u8,
    pub shard_id: u64,
    pub token_mint: Pubkey,
    pub collateral_mint: Pubkey,
}

#[event]
pub struct LoanIssued {
    pub lender: Pubkey,
    pub borrower: Pubkey,
    pub amount: u64,
    pub rate: u8,
    pub shard_id: u64,
    pub token_mint: Pubkey,
    pub collateral_mint: Pubkey,
}

#[event]
pub struct LoanRepaid {
    pub lender: Pubkey,
    pub borrower: Pubkey,
    pub amount: u64,
    pub shard_id: u64,
    pub token_mint: Pubkey,
    pub collateral_mint: Pubkey,
}

#[event]
pub struct LoanLiquidated {
    pub lender: Pubkey,
    pub borrower: Pubkey,
    pub liquidator: Pubkey,
    pub amount: u64,
    pub collateral: u64,
    pub profit: u64,
    pub shard_id: u64,
    pub token_mint: Pubkey,
    pub collateral_mint: Pubkey,
}

#[event]
pub struct BidExpired {
    pub lender: Pubkey,
    pub amount: u64,
    pub refund_amount: u64,
    pub fee_amount: u64,
    pub shard_id: u64,
    pub token_mint: Pubkey,
}

#[event]
pub struct AskExpired {
    pub borrower: Pubkey,
    pub amount: u64,
    pub refund_amount: u64,
    pub fee_amount: u64,
    pub shard_id: u64,
    pub token_mint: Pubkey,
    pub collateral_mint: Pubkey,
}

#[event]
pub struct FeesWithdrawn {
    pub admin: Pubkey,
    pub shard_id: u64,
    pub amount: u64,
    pub token_mint: Pubkey,
}
