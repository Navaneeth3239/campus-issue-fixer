# Camp Helper

Build the frontend for "CampSolver" — a mobile-first student issue reporting web app that will later be wrapped into a native app via Applix (WebView). Assume a REST + Socket.IO backend already exists and is reachable at an env-configured base URL.

TECH STACK
- React.js + Vite (latest)
- Tailwind CSS, mobile-first
- React Router
- Axios with interceptors for JWT (attach Authorization header, handle 401 by redirecting to login)
- Socket.IO client
- Bottom tab navigation, large touch targets (min 44px), camera-friendly file inputs

ENV VARIABLES (never hardcode)
VITE_API_BASE_URL
VITE_SOCKET_URL

PAGES / SCREENS
1. Splash/Auth check
2. Register (name, email, password)
3. Login
4. Home — quick actions, recent issue status, notifications badge
5. Report Issue (multi-step form):
   - Title, Description
   - Category dropdown: Electrical, Plumbing, Water Leakage, Wi-Fi/Network, Infrastructure, Furniture, Classroom, Laboratory, Hostel, Cleanliness, Safety, IT Equipment, Other
   - Photo upload: camera + gallery, multiple images, preview + remove before submit
   - Optional video upload
   - Location: auto-capture GPS (browser Geolocation API) + dropdown of predefined locations (Block A, Block B, Laboratory, Library, Hostel, Canteen, Playground, Parking Area)
   - Priority selector (LOW/MEDIUM/HIGH) with inline explanation text for each level
   - On submit: run duplicate-check; if a match is found, show the existing ticket (ID, title, location, status, date) with two buttons: "Follow Existing Issue" or "Report as Separate Issue"
   - On success, show ticket confirmation screen with generated ticket ID format CS-YYYY-XXXXX
6. My Issues — list submitted + followed issues, filter by status
7. Issue Detail — full ticket info, images, vertical status timeline (✓ Reported → ✓ Assigned → ● In Progress → ○ Resolved → ○ Verified → ○ Closed), each step shows date/time/action/department/comment, live-updates via Socket.IO (join room issue:{ticketId}, listen for issueStatusChanged, issueUpdated, issueResolved — no manual refresh needed)
8. Resolution Verification — when status is RESOLVED, show resolution comment + image, buttons: Verify (→ Verified/Closed) or Reject & Reopen
9. Notifications — list, mark as read
10. Profile — view info, logout

UX REQUIREMENTS
- Fast load, skeleton loaders, optimistic submit UI
- Priority color coding: LOW=blue, MEDIUM=amber, HIGH=red
- Status color coding + text/icon (never color alone)
- Keep in-progress form data in memory/localStorage until a submit succeeds
- No desktop-only interactions (no hover-dependent UI)

Build clean, componentized, production-style code. Include a .env.example with placeholder values only.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b8ed4db4-d63f-48ad-a0d2-4bf8fa6338ce).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
