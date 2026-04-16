## ContentKosh Mobile — Manual QA Matrix (Days 1–18)

Run this on **Android + iOS** (physical device preferred) for each role: **ADMIN**, **TEACHER**, **STUDENT**.

### Setup
- **Build**: Debug build from Expo / dev client
- **API**: `EXPO_PUBLIC_API_URL` points to the intended environment
- **Accounts**: 1 account per role in the same business

### Global checks (all roles)
- **Cold start**: app opens without crash
- **Session restore**: closing + reopening keeps you logged in (cookie session)
- **Logout**: logout clears session and returns to Login
- **Unauthorized handling**: expired session forces re-auth cleanly
- **More tab**: opens drawer reliably

### Auth (all roles)
- **Login**: valid credentials succeed
- **Login failure**: invalid credentials show “Invalid email or password.”
- **Register**: account creation (if enabled in backend)

### Dashboard
- **Dashboard loads**: shows role-appropriate stats/cards
- **Pull to refresh**: refresh updates counts without UI break

### Announcements
- **List**: loads announcements
- **Detail**: open an announcement
- **Create/Edit/Delete**:
  - ADMIN: can manage where allowed by backend permissions
  - TEACHER: can manage their own where allowed
  - STUDENT: read-only

### Batches
- **Batches hub**: list loads
- **Batch detail**: members show
- **Add/remove member**: role-gated behavior works (confirm dialogs on destructive actions)

### Content
- **Library**: list loads and filters work
- **Open content**: preview/share/open succeeds for at least one item
- **Upload/Edit/Delete**: ADMIN/TEACHER only (where exposed)

### Tests
- **Tests hub**:
  - ADMIN/TEACHER: see manage/test lists
  - STUDENT: see available / my tests
- **Attempt (student)**:
  - start attempt, answer one question, submit
  - result screen loads for the submitted attempt

### Admin-only flows
- **Users list**: open `Admin Users`, search by email/name/role
- **Teacher profile**: open a TEACHER → profile loads (or shows “No teacher profile found”)
- **Remove user**: destructive action always requires confirm dialog
- **Non-admin block**: TEACHER/STUDENT cannot access Admin Users screen

