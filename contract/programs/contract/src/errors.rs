use anchor_lang::prelude::*;

// Errors
#[error_code]
pub enum ErrorCode {
    #[msg("Invalid shard ID")]
    InvalidShard,
    #[msg("Shard mismatch")]
    ShardMismatch,
    #[msg("Shard pool is full")]
    PoolFull,
    #[msg("No matches found")]
    NoMatchesFound,
    #[msg("Loan already repaid")]
    AlreadyRepaid,
    #[msg("Partial match not allowed")]
    PartialMatchNotAllowed,
    #[msg("Unsupported token")]
    UnsupportedToken,
    #[msg("Unsupported collateral token")]
    UnsupportedCollateral,
    #[msg("Invalid repayment token")]
    InvalidRepaymentToken,
    #[msg("Loan is not unhealthy")]
    LoanNotUnhealthy,
    #[msg("Insufficient collateral for healthy loan")]
    InsufficientCollateral,
    #[msg("Invalid loan duration")]
    InvalidDuration,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient funds in fee vault")]
    InsufficientFunds,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Invalid vault account")]
    InvalidVaultAccount,
    #[msg("Invalid shard count")]
    InvalidShardCount,
    #[msg("No supported tokens provided")]
    NoSupportedTokens,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Invalid collateral amount")]
    InvalidCollateral,
    #[msg("Invalid loan index")]
    InvalidLoanIndex,
    #[msg("Insufficient swap proceeds")]
    InsufficientSwapProceeds,
}
