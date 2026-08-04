# User

Users can have 2 roles: Member, Admin

## Member:
- can see public pages; cannot login to admin (except admin create the user as moderator)
- can contribute and update
- can see history
- can create story, and comments and kudos story; also update their own story

# Admin:
- can do anything

# Profile
- User can have three profiles: User Profile, Guide Profile and Moderator Profile

# User Profile
- All personal information
- Every user have this profile

# Guide Profile
- Contribution details such as contributions count (creating activity, updating activity, adding story, etc)
- Approvals: Show details on approved changes of other users
- Guide Level: Calculate based on contributions and level allows what contributions can they do.
- All users will have this profile. New users will have guide level 1 based on their contributions their level will be upgraded

# Moderator Profile
- Can do almost anything as Admin with few restrictions
- Members will get this profile after admin make this user moderator
- Can log in to admin site

# Guide Level, Calculations and Permissions based on level

## Guide Level
- It is the metrics to measure the contribution of member.
- At the beginning member will have level 1.

## Calculations
- Points will be added only after approval.
- If the member create an activity he will get contribution point 10.
- If the member update an activity created by others not him/herself he will get contribution point 20.
- If the member uploaded image he/she will get 2 points for each image, if the image is reported fake or false by someone and the report is approved it will minus 3 points.
- If the member added trail/spot to the activity he/she will get 20 points.
- If the member updated trail/spot to the activity he/she will get 25 points.
- If the added/updated trail/spot is reported false/fake and approved it will reduce 30points for that contributor.
- Member can approve the contribution after reaching guide level 10.
- For all contribution to be approved minimum of 5 guides with at least guide level 10 must approve.
- Admin/Moderators can approve anything.
- Anyone can report the update or changes and if one guide with level 10 approve the report the changes will be removed from the system and reduced contribution points according to above rule.
- Report must be approved or rejected by at least one guide.
- Only the approved changes will be seen in activity page. We need to add a see unapproved changes in the page so that any user can see the unapproved changes too and level 10 guide will have access to approve/decline the unapproved changes.
- In the history guides who approved the changes must be visible.

## Permission
- Guide with level less than 10 can contribute on anything
- Guide with level can't approve anything

- Guide with level 10 or more can approve changes and reports

- Guide with level 25 or more can apply for moderation
