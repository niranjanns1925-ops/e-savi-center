# Security Specification for Lakshmi E-Sevai Maiyam

## Data Invariants
- A request must be linked to an existing service.
- Only admins can create/update/delete services.
- Users can only see and manage their own requests.
- Admins can see and manage all requests.
- A user cannot change their own role in their profile.
- Rejection of a request requires a reason.
- Request status shifts are restricted (e.g., users can't approve their own requests).

## Dirty Dozen Payloads (Target: DENY)

1. **Identity Spoofing**: User A attempts to create a request with `userId: "UserB"`.
2. **Privilege Escalation**: User A attempts to update their `/users/UserA` document to set `role: "admin"`.
3. **State Shortcutting**: User A updates their request status from `pending` to `accepted`.
4. **Service Tampering**: Non-admin user attempts to `create` a document in `/services/`.
5. **Unauthorized Inspection**: User A attempts to `get` the request of User B.
6. **Immutable Field Attack**: User A attempts to update the `createdAt` timestamp of a request.
7. **Resource Poisoning**: User A attempts to send a request with a `serviceTitle` string of 1MB.
8. **Orphaned Writes**: User A creates a request for a `serviceId` that does not exist in `/services/`.
9. **Admin Spoofing**: User A attempts to join the `/services/` collection by using an ID that matches the admin's email.
10. **Shadow Field injection**: User A adds `isVerified: true` to their request payload to bypass a logic gate.
11. **PII Leak**: User A tries to `list` the `/users/` collection.
12. **Missing Rejection Reason**: Admin attempts to update a request status to `rejected` without providing a `rejectionReason`.

## Test Runner (firestore.rules.test.ts snippet)
*(Implementation will follow in code)*
