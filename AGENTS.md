<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- User administration runs only in `createServerFn` handlers in `src/lib/account.functions.ts`, which check the caller's super_admin/administrator role via the service client before acting — RLS and route guards are UX, the server check is the boundary.
- Users sign in with a username; the email is resolved server-side in `loginWithUsername` so emails are never exposed to anonymous callers.
- Super Admin accounts cannot be modified through the management UI; only Super Admins can grant or manage the Administrator role.
