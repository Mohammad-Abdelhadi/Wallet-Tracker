# Security Specification - Mali (مالي)

## 1. Data Invariants
- A user can only access their own profile, transactions, and jars.
- `selectedBanks` must be an array of strings with a maximum of 10 items.
- `amount` in transactions and jars must be a number.
- `type` in transactions must be one of: `income`, `expense`, `transfer`.
- `updatedAt` and `date` must be valid ISO strings (validated by size/format regex).
- Document IDs must match the `isValidId` pattern to prevent ID poisoning.

## 2. The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a user profile for someone else.
2. **Identity Spoofing (Update)**: Attempt to change another user's `selectedBanks`.
3. **Privilege Escalation**: Attempt to set `isAdmin: true` on a user profile (system doesn't have admins yet, but this should fail).
4. **ID Poisoning**: Use a 2KB string as a transaction ID.
5. **ID Poisoning (Referential)**: Use a malformed `userId` to point to a nonexistent path.
6. **State Hijacking**: Change a transaction's `amount` after it's been created (if we want immutability).
7. **Phantom Fields**: Add `bonusPoints: 1000000` to a `User` document.
8. **Resource Exhaustion**: Send a transaction description that is 1MB in size.
9. **Type Confusion**: Send `amount: "one hundred"` instead of `amount: 100`.
10. **Orphaned Write**: Create a transaction without a valid `walletId` (if required).
11. **Negative Jar**: Set a jar's `currentAmount` to -5000.
12. **Future Jar**: Set `currentAmount` > `targetAmount` (actually allowed, but target must be positive).

## 3. Red Team Evaluation (Pre-Rules)
| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning |
| :--- | :--- | :--- | :--- |
| users | YES (No validation) | YES | YES |
| transactions | YES | YES | YES |
| jars | YES | YES | YES |
