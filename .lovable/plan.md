# User Management Completion Plan

## Decisions
- The 4 roles stay: Super Admin, S1, S2, S3. Every new user gets one of S1, S2 or S3. Existing Unassigned (viewer) accounts can still be viewed and edited.
- An optional **Administrator** role, assigned only by a Super Admin, gives full User Management access. Administrators cannot create, edit, demote or delete Super Admins, and they cannot create other Administrators.
- Create User requires a real email address. Users still sign in with **username + password**. The system looks up the email on the server, so emails are never exposed to signed-out visitors.
- Passwords are handled only by the sign-in service. They are never stored or shown.

## 1. User Management page (/admin/users) — upgrade the existing page
- Create/Edit form: Full Name, Username, Email, Password + Confirm (only when creating), Department, Role, Status.
- Table columns: Full Name, Username, Email, Department, Role, Status, Last Login, Created At, Actions.
- Actions: Edit (username, email, department, role, status), Activate/Deactivate (with confirmation), Reset Password (new password + confirm), Delete (with confirmation).
- Keep the existing summary cards, filters, Rwanda styling, success/error messages and responsive layout.
- Last Login is recorded on each successful sign-in.

## 2. Server-side security
- Every action runs on the server. Each one first checks that the caller is a Super Admin or an Administrator, then applies these rules:
  - No one can change their own role, deactivate their own account or delete it.
  - Only a Super Admin can grant the Super Admin or Administrator roles; through the normal form, no one can create a new Super Admin.
  - The first Super Admin account can never be deactivated, demoted or deleted.
- Deactivated users are blocked at sign-in and locked out of the sign-in service. If they still have an open session, the app's main layout signs them out.
- Database rules: users can read only their own profile and roles. They can edit their own name and phone but not their status, role or username. Only admins can read every row. Role changes happen only through the server.
- Each create, edit, role change, activate/deactivate, password reset and delete is written to the audit log.

## 3. Navigation and access
- The sidebar shows "User Management" (/admin/users) and Audit Log only to Super Admins and Administrators. The old /users page redirects to /admin/users.
- /admin/users and /audit-log send S1, S2, S3 and Unassigned users back to the dashboard. The server actions refuse them too.
- After sign-in, every user lands on /dashboard, which shows only their own section's cards and menus.

## 4. Remaining tasks carried over
- **Audit Log Explorer:** filters for module, action, user and date range, plus search, CSV export and pagination.
- **Document text extraction:** uploading a document reads its text with AI and suggests a title, names, dates and ID numbers. The user reviews the suggestions before saving.
- **Soldier CSV import:** verify the import works and fix anything it breaks.

## 5. Demo data
- Add sample users: 2 each for S1, S2 and S3, with emails on a demo domain. Their temporary passwords will be shared with you in chat, never stored in the database.
- Add a few more soldiers, vehicles and intelligence file records, all marked as samples.

## 6. Testing
Check end-to-end in the browser:
1. Super Admin signs in.
2. Super Admin creates an S1, an S2 and an S3 user.
3. Each new user signs in with username + password and sees their own dashboard and menus.
4. Super Admin changes a user's role.
5. Super Admin deactivates a user, and that user can no longer sign in.
6. Super Admin resets a password, and the new password works.
7. S1, S2, S3 and Unassigned users cannot reach /admin/users, even by typing the address.
8. No password appears in any database table.

## Technical details
- Small migration: add `last_login` writes; tighten `profiles`/`user_roles` policies (add an `is_user_admin()` security-definer helper that checks super_admin or administrator); add a trigger that blocks non-admins from changing `status`/`username` on their own profile.
- Extend `src/lib/account.functions.ts`, using `createServerFn` and the admin client loaded inside each handler (not Edge Functions, per project stack). Replace `assertSuperAdmin` with `assertUserAdmin(callerRoles)` plus the target-role rules. Accept the email and keep it in sync with auth via `updateUserById({ email })`. `loginWithUsername` resolves the email on the server and updates `last_login`.
- Route guard in `admin/users.tsx` and `audit-log.tsx` checks for super_admin or administrator. `users.tsx` becomes a redirect. `useAuthState` gains `isUserAdmin`; the sidebar uses it.
- OCR: a server function that calls the Lovable AI Gateway (Gemini vision) on the uploaded file and returns structured fields.
- Demo users are created through the same server-side admin path.
- Record the admin-authorization rule in AGENTS.md.
