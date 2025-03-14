use anchor_lang::prelude::*;
#[account]
pub struct LendAuction {
    pub admin: Pubkey,
    pub shard_count: u64,
    pub total_loans: u64,
    pub supported_tokens: Vec<Pubkey>,
}

#[account]
pub struct ShardPool {
    pub shard_id: u64,
    pub bids: Vec<Bid>,
    pub asks: Vec<Ask>,
}

#[account]
pub struct LoanPool {
    pub shard_id: u64,
    pub loans: Vec<Loan>,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Loan {
    pub lender: Pubkey,
    pub borrower: Pubkey,
    pub amount: u64,
    pub rate: u8,
    pub collateral: u64,
    pub repaid: bool,
    pub shard_id: u64,
    pub token_mint: Pubkey,
    pub collateral_mint: Pubkey,
    pub start_slot: u64,
    pub duration_slots: u64,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Bid {
    pub lender: Pubkey,
    pub amount: u64,
    pub min_rate: u8,
    pub slot: u64,
    pub token_mint: Pubkey,
    pub duration_slots: u64,
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Ask {
    pub borrower: Pubkey,
    pub amount: u64,
    pub max_rate: u8,
    pub collateral: u64,
    pub slot: u64,
    pub token_mint: Pubkey,
    pub collateral_mint: Pubkey,
}
