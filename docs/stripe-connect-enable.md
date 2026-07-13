# Stripe Connect enablement notes

TableFlow’s premium market promise — “from scan to paid, in one tap” — depends on the platform becoming a full Stripe Connect host so real venues can onboard Express or Custom accounts for payouts. Until Stripe Connect is accepted, staging runs in “platform charges” mode (see `STRIPE_PLATFORM_CHARGES=1` in `.env.example`), which can’t be used in production.

## Current blocking state
- Platform account `acct_1Pq0wFRtZ0unuMCb` (kinvisuals) still shows the “Connect not enabled” banner in Stripe.
- `stripe accounts create --type=express` fails with the message “You can only create new accounts if you’ve signed up for Connect”.
- Production payouts cannot work until the Dashboard Connect flow is completed (live + test).

## Enablement steps
1. Log into Stripe Dashboard as the platform owner.
2. Open **Connect → Get started** and accept all required terms for both **test** and **live** modes.
3. Confirm the platform settings show Connect as active and that the account now lists the relevant business information (UK/US details, bank info, etc.).
4. Run `stripe accounts create --type=express` against the platform’s *live* API key to confirm onboarding works (the same command should succeed in test mode once Connect is active there as well).
5. If CLI errors persist, re-check the Dashboard for any missing verification steps (business profile, banking, or tax forms) before retrying the CLI command.

## Post-activation checklist
- Notify the front-end team so they can flip off `STRIPE_PLATFORM_CHARGES=1` in staging and start calling `accounts.create`.
- Update TAB-28/TAB-37 comments: include the Stripe Dashboard confirmation, CLI success output, and any remaining follow-up (e.g., verifying payouts, updating secrets).
- Securely store any additional keys or webhooks created during this process and rotate webhook secrets as needed.

## Observability
- Keep a note of the last successful `stripe accounts create` invocation date/time for future debugging.
- After payouts are enabled, monitor `payment_intent` webhooks to verify that `paid_at` and kitchen queue flow continue to align with TableFlow’s “paid ticket” invariant.

If you can’t finish these steps yourself, hand the runbook to the team member who owns the Stripe Dashboard so they can complete the Connect signup and drop a confirmation comment on TAB-28.
