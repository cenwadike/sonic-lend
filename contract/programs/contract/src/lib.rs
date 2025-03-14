#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

declare_id!("EDvhvdnYVX2JsuAXvJXvBN3jd79ceNYMMnw11JSvzCPo");

#[program]
pub mod contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
