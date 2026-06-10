# 📋 SplitEase - Complete Features & Functions Inventory

## 🎯 For Design Planning with Stitch

This is a comprehensive list of all features and functions in SplitEase for designing with Stitch or any design tool.

---

## 🏠 AUTHENTICATION & USER MANAGEMENT

### Sign Up / Registration
- ✅ Email input field
- ✅ Password input field (min 6 characters)
- ✅ Name input field
- ✅ Submit button
- ✅ Link to signin page
- ✅ Password validation
- ✅ Email validation
- ✅ Error message display

### Sign In / Login
- ✅ Email input field
- ✅ Password input field
- ✅ Remember me checkbox (optional)
- ✅ Submit button
- ✅ Link to signup page
- ✅ "Forgot Password" link
- ✅ Error message display
- ✅ Loading spinner

### Forgot Password
- ✅ Email input field
- ✅ Submit button
- ✅ Success message
- ✅ Link back to signin

### Reset Password
- ✅ New password input field
- ✅ Confirm password input field
- ✅ Submit button
- ✅ Token validation
- ✅ Error handling
- ✅ Success confirmation

### User Profile
- ✅ Profile avatar / initial
- ✅ User name display / edit
- ✅ Email display (read-only)
- ✅ UPI ID input
- ✅ Save profile button
- ✅ Logout button
- ✅ Profile picture upload (optional)

---

## 👥 FRIENDS & CONNECTIONS

### Friends List Page
- ✅ Friends list view
- ✅ Friend cards (name, email, avatar)
- ✅ Add friend button
- ✅ Remove friend button
- ✅ Mutual friends count badge
- ✅ Search friends box
- ✅ Filter options
- ✅ Empty state ("No friends yet")

### Mutual Friends Feature
- ✅ Mutual friends card component
- ✅ "Groups in common" section with badges
- ✅ "You both know" section with avatars
- ✅ Mutual count display (+X more)
- ✅ Loading state
- ✅ Empty state ("No mutual friends yet")
- ✅ Integration on group member cards
- ✅ Integration on user profiles

### Friend Suggestions
- ✅ "People you might know" section
- ✅ Suggestion cards with avatars
- ✅ Mutual groups count
- ✅ Add friend button per suggestion
- ✅ Dismiss button
- ✅ Empty state

---

## 💰 GROUP MANAGEMENT

### Create Group Page
- ✅ Group name input field
- ✅ Group emoji picker
  - 🏠 🏖️ ✈️ 🍕 🚗 🎉 🛒 🏖️ 💼 🎮 🏋️ 🎓 🎵 🎬 🍺 🏕️ 🎁 🐶 💊 ⚽
- ✅ Currency selector
  - ₹ INR
  - $ USD
  - € EUR
  - £ GBP
  - ¥ JPY
  - د.إ AED
- ✅ Add new member form
  - Name input
  - Email input
  - Password input
  - Add button
- ✅ Smart user search box
  - Search by name/email
  - Shows "X mutual groups" badge
  - Shows avatars
  - One-click add
- ✅ Selected members list
  - Member cards with remove button
  - Avatar display
  - Name and email
- ✅ Create group button
- ✅ Cancel button
- ✅ Loading states
- ✅ Error messages

### Groups List Page
- ✅ Groups list view
- ✅ Group card with:
  - Group emoji
  - Group name
  - Member count
  - Total amount
  - Last activity time
- ✅ Create new group button
- ✅ Sort options (recent, alphabetical)
- ✅ Search groups box
- ✅ Empty state ("No groups yet")

### Group Detail Page
- ✅ Group header
  - Emoji
  - Name
  - Member count
  - Settings button
- ✅ Tabs / Sections
  - Members & Balances
  - Expenses
  - Activity
  - Analytics (if available)
- ✅ Invite panel
  - Copy invite link button
  - Share button
  - Revoke link button
  - Link display with copy functionality
- ✅ Add member button
- ✅ Members & Balances section
  - Member card for each person:
    - Avatar
    - Name
    - Status (owed money / owes money / settled up)
    - Balance amount (color-coded)
    - Remove member button
    - **Mutual Friends Card**
      - Groups in common
      - You both know section
      - +X more indicator

### Group Settings
- ✅ Group name edit
- ✅ Currency change
- ✅ Emoji change
- ✅ Delete group button
- ✅ Leave group button
- ✅ Confirm dialogs

---

## 💸 EXPENSE MANAGEMENT

### Add Expense Page / Modal
- ✅ Expense description input
- ✅ Amount input field
- ✅ Category selector
  - 🍽️ Food
  - 🚗 Transport
  - 🏠 Housing
  - 🎉 Entertainment
  - 🛒 Shopping
  - ✈️ Travel
  - 💊 Health
  - 🔧 Utilities
  - 💡 Other
- ✅ "Who paid?" dropdown
- ✅ Notes input field
- ✅ Receipt upload button
  - Preview image
  - Remove button
- ✅ Split type selector
  - Equal split
  - Custom amounts
  - Percentage split (planned)
- ✅ Member selector with amounts
  - Checkboxes
  - Amount inputs
  - Auto-calculate for equal split
  - Visual preview of split
- ✅ Save button
- ✅ Cancel button
- ✅ Loading spinner
- ✅ Error messages

### Edit Expense Page / Modal
- ✅ All fields from add expense
- ✅ Update button instead of save
- ✅ Delete button
- ✅ Confirmation dialog for delete

### Expenses List
- ✅ Expense items
  - Category emoji
  - Description
  - Amount (color-coded)
  - Who paid
  - Date
  - Click to expand
- ✅ Filter options
  - By category
  - By person
  - By date range
- ✅ Sort options
  - Recent first
  - Amount (high to low)
- ✅ Search expenses box
- ✅ Empty state ("No expenses yet")

### Personal Expenses View
- ✅ All expenses user paid or is split into
- ✅ Cross-group expense summary
- ✅ Filter by group
- ✅ Sort options
- ✅ Total spent display

---

## 💳 BALANCE & SETTLEMENT

### Balances Section
- ✅ Member balance cards
  - Member name
  - Balance amount (color-coded)
  - Status badge
    - 🟢 Green: You're owed
    - 🔴 Red: You owe
    - ⚪ Gray: Settled
- ✅ Settlement recommendations
  - "A owes B ₹500" cards
  - Quick settle button
- ✅ Total owed / Total owed to you display

### Settlement / Payment Flow
- ✅ Settlement modal
  - From user selector
  - To user selector
  - Amount input
  - Payment method selector
    - UPI
    - Manual entry
- ✅ UPI payment integration
  - App-specific deep links
  - Copy UPI ID button
  - Payment confirmation
- ✅ Quick settle button (from balances)
  - Pre-filled with recommendation
  - Quick confirmation
- ✅ Settlement history
  - Chronological list
  - Who paid whom
  - Amount
  - Date
  - Delete button

### Settlement Records
- ✅ Settlement card
  - From user
  - To user
  - Amount
  - Date
  - Delete option

---

## 📊 ACTIVITY & ANALYTICS

### Activity Feed
- ✅ Activity items
  - Type: expense added, expense edited, settlement recorded
  - User who performed action
  - Description
  - Amount
  - Timestamp
- ✅ Filter options
  - By activity type
  - By user
  - By date range
- ✅ Chronological order
- ✅ Empty state

### Analytics Dashboard
- ✅ Spending summary
  - Total spent (all time / this month)
  - Average expense
  - Most common category
- ✅ Charts (if implemented)
  - Spending by category (pie chart)
  - Spending over time (line chart)
  - Top spenders (bar chart)
- ✅ Statistics
  - Number of transactions
  - Number of settlements
  - Number of active groups
- ✅ Insights
  - Most expensive group
  - Most active friend
  - Your biggest expense

---

## 🔔 NOTIFICATIONS & REMINDERS

### Notification Types
- ✅ Someone added you to a group
- ✅ Expense added to group you're in
- ✅ Settlement needed (balance reminder)
- ✅ Friend request notification
- ✅ Payment reminder
- ✅ Group invitation accepted

### Notification Display
- ✅ Notification badge (count)
- ✅ Notification center / Inbox
- ✅ Mark as read
- ✅ Delete notification
- ✅ Notification detail view

### Reminders
- ✅ Settle money reminder
- ✅ Overdue payment notification
- ✅ Recurring expense reminder

---

## 📱 NAVIGATION & UI

### Web Navigation
- ✅ Top header
  - Logo
  - Search box
  - Notifications bell
  - Settings icon
  - Profile dropdown
    - View profile
    - Logout
- ✅ Sidebar navigation
  - Home
  - Groups
  - Friends
  - Activity
  - Analytics
  - Settings
  - Profile
- ✅ User indicator / Avatar

### Mobile Navigation
- ✅ Bottom tab bar
  - Groups
  - Activity
  - Friends
  - Profile
  - Settings
- ✅ Top header
  - Back button
  - Page title
  - Action buttons (+ add, etc.)
- ✅ User avatar in header

### Common UI Elements
- ✅ Loading spinners
- ✅ Error messages / Alerts
- ✅ Success messages / Toast notifications
- ✅ Modals / Dialogs
- ✅ Confirmation dialogs
- ✅ Dropdowns
- ✅ Input fields
- ✅ Buttons (primary, secondary, danger)
- ✅ Cards
- ✅ Badges
- ✅ Avatars
- ✅ Color coding
  - Green: You're owed
  - Red: You owe
  - Gray: Settled

---

## 🎨 DESIGN TOKENS

### Colors
- **Primary Purple**: #7C3AED
- **Secondary Purple**: #6D28D9
- **Light Purple**: #EDE9FE
- **Dark Gray**: #0f172a
- **Medium Gray**: #475569, #64748b
- **Light Gray**: #E2E8F0, #F3F0FF, #F8FAFC
- **Green (owed)**: #16a34a, #dcfce7
- **Red (owes)**: #e11d48, #fee2e2
- **Neutral Gray**: #94a3b8, #D1D5DB

### Typography
- **Heading**: 22px, 900 weight (bold)
- **Section Title**: 15px, 800 weight
- **Body**: 14px, 500-600 weight
- **Small Text**: 12px, 500-600 weight
- **Tiny Text**: 11px, 600 weight

### Spacing
- **Small**: 8px
- **Medium**: 12px
- **Large**: 16px
- **Extra Large**: 20-24px
- **Page Padding**: 16px (mobile), 24-32px (web)

### Border Radius
- **Small**: 8px
- **Medium**: 12px
- **Large**: 14px-16px
- **Full**: 50% (avatars)

### Shadows
- **Subtle**: 0 1px 6px rgba(0,0,0,0.06)
- **Medium**: 0 4px 12px rgba(0,0,0,0.08)
- **Input Focus**: 0 0 0 3px rgba(124, 58, 237, 0.1)

---

## 🔄 RECURRING FEATURES (Planned)

### Recurring Expenses
- ✅ Recurrence selector
  - None
  - Weekly
  - Monthly
- ✅ Next due date display
- ✅ Automatic creation on schedule
- ✅ Mark complete / Skip option
- ✅ Edit recurring rules
- ✅ Cancel recurrence

---

## 🔐 AUTHORIZATION & PERMISSIONS

### User Can:
- ✅ Create groups
- ✅ Add members to own groups
- ✅ Remove members from own groups
- ✅ Add expenses to groups they're in
- ✅ Edit own expenses
- ✅ Delete own expenses
- ✅ Record settlements
- ✅ View group balances
- ✅ Accept group invitations
- ✅ Leave groups
- ✅ Edit own profile

### User Cannot:
- ❌ Edit others' expenses
- ❌ Delete others' expenses
- ❌ Remove group creator
- ❌ Delete groups (owner only)
- ❌ Change group currency/emoji (owner? tbd)

---

## 📤 EXPORT & SHARING

### Export Options
- ✅ Export group as CSV
  - All expenses
  - Members
  - Balances
- ✅ Export activity feed
- ✅ Export analytics report

### Sharing
- ✅ Share group invite link
- ✅ Copy invite link
- ✅ Revoke invite link
- ✅ Share group summary
- ✅ Send payment reminder via email

---

## 🔧 SETTINGS & PREFERENCES

### User Settings
- ✅ Theme (dark/light) - if implemented
- ✅ Notification preferences
  - Email notifications on/off
  - In-app notifications on/off
  - Payment reminders on/off
- ✅ Privacy settings
  - Show profile publicly
  - Allow friend requests
- ✅ Currency preference (default)

### Group Settings (Admin)
- ✅ Group name
- ✅ Group emoji
- ✅ Group currency
- ✅ Invite link management
- ✅ Delete group

---

## 📋 FORM FIELDS & INPUTS

### Input Types
- ✅ Text input (name, description, notes)
- ✅ Email input (with validation)
- ✅ Password input (with strength indicator)
- ✅ Number input (amount)
- ✅ Currency input
- ✅ Dropdown/Select (category, user, currency)
- ✅ Radio buttons (split type)
- ✅ Checkboxes (member selection)
- ✅ Date picker (optional, for future)
- ✅ File upload (receipt)
- ✅ Search input

### Form States
- ✅ Default state
- ✅ Focused state
- ✅ Filled state
- ✅ Error state
- ✅ Disabled state
- ✅ Loading state

---

## 📲 RESPONSIVE BREAKPOINTS

### Mobile
- ✅ Portrait layout (320px - 480px)
- ✅ Full-width cards
- ✅ Bottom navigation
- ✅ Stacked forms

### Tablet
- ✅ 600px - 1024px
- ✅ Two-column layouts
- ✅ Side navigation option

### Desktop
- ✅ 1024px+
- ✅ Multi-column layouts
- ✅ Sidebar navigation
- ✅ Wider content areas

---

## 🎬 ANIMATIONS & TRANSITIONS

### Micro-interactions
- ✅ Button hover effects
- ✅ Form field focus animations
- ✅ Card hover lift
- ✅ Loading spinner (rotating)
- ✅ Success toast slide-in
- ✅ Error message shake (optional)
- ✅ Modal fade-in/out
- ✅ Slide animations for navigation
- ✅ Skeleton loaders

### Timing
- ✅ Fast: 150ms (hover states)
- ✅ Medium: 200-300ms (modal open/close)
- ✅ Slow: 500ms+ (page transitions)

---

## 🔍 SEARCH & FILTER

### Search Features
- ✅ Search groups by name
- ✅ Search expenses by description
- ✅ Search friends by name
- ✅ Search users in "add to group"
- ✅ Real-time results
- ✅ Debounced search

### Filter Features
- ✅ Filter expenses by category
- ✅ Filter expenses by person
- ✅ Filter expenses by date
- ✅ Filter activity by type
- ✅ Filter activity by user
- ✅ Apply multiple filters

---

## 🏁 EDGE CASES & EMPTY STATES

### Empty States
- ✅ No groups yet
- ✅ No expenses yet
- ✅ No friends yet
- ✅ No activity yet
- ✅ No mutual friends yet
- ✅ No search results

### Loading States
- ✅ Loading group details
- ✅ Loading expense list
- ✅ Loading balances
- ✅ Loading activity feed

### Error States
- ✅ Network error
- ✅ Authentication error
- ✅ Validation error
- ✅ Server error (500)
- ✅ Not found error (404)

---

## 📊 SUMMARY COUNTS

**Total Features**: 200+
**Total Pages/Screens**: 15+
**Total Components**: 50+
**Total Form Fields**: 20+
**Total API Endpoints**: 30+

---

## 🎨 USE THIS FOR STITCH

Copy this entire list into Stitch and use it to:

1. **Create a feature inventory**
   - Organize by page/section
   - Mark completion status
   - Track design progress

2. **Build design components**
   - Create component library
   - Document all states
   - Create patterns

3. **Plan design flows**
   - Map user journeys
   - Identify missing states
   - Plan micro-interactions

4. **Design specifications**
   - Colors and tokens
   - Typography scale
   - Spacing system
   - Shadow system

---

**Ready to design!** Use this inventory as your design source of truth. ✨

