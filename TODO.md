# TODO

## Bugs

- [x] Diary date doesn't update content when navigating between dates
- [ ] Bottom row needs more padding below so it sits above phone home indicator
- [ ] Top bar needs bottom border or shadow to separate from same-color page background
- [ ] Bottom bar disappears at wide aspect ratios leaving no way to navigate the app
- [ ] Profile picture crop modal prompts for file selection twice (once in main dialog, once in crop modal)
- [x] AI Conversation send button doesn't do anything
- [x] "Take a Photo" div does not go away after adding photo
- [x] Photo button on Android only allows camera, should also allow uploading pre-existing photo
- [ ] Account and Help options in More page don't do anything
- [x] Brand not saved in Quick Add — disappears when reopening the same item
- [x] Quick Add items appear in recent foods (should only show manually logged items)

## Features

- [x] Redesign Add Food screen to be MyFitnessPal-style:
    - [x] Search bar at top that filters history list
    - [x] Action buttons row below search: Quick Add and Food Photo (no voice log or barcode yet)
    - [x] History section showing recently logged foods with name, calories, serving size, and add button
    - [x] Sort history by most recent
- [ ] Add barcode scanning to food logging
- [ ] Edit food logs by clicking on log entries in the diary screen
- [ ] Log Food Photo should be the top option in the plus menu above Log Food
- [ ] /food route is unreachable from UI — Diary tab goes to /food/daily, so the "Custom Foods" button on /food is inaccessible. Add Custom Foods option to FAB modal
- [ ] Calorie goal setting in More page
- [ ] Recent food items in Add Food screen should have a + button on the right side to quickly add to the selected meal
- [ ] Move date selector in Diary screen to top bar next to "Diary" title
- [ ] Quick Add bar should replace Add Food bar, containing back and check buttons
- [ ] After clicking check button in Quick Add, redirect to last non-Add Food page (or home if none exists)
- [ ] Add height field to user profile
- [ ] Use height, weight, and activity level to calculate daily calorie usage
- [ ] Set weekly calorie goal based on target weight loss per week (0lb to 2lb in 0.5lb intervals)
- [ ] Target weight loss per week should be a setting on the More page
- [ ] Goal ETA on Progress page — show expected date to reach weight goal under Distance to Goal, calculated using most recent weight/date and weekly weight loss goal
- [ ] Then and Now on Progress page — collapsed by default, under weight trend, shows side-by-side starting weight picture/label and current weight picture/label
- [ ] Timelapse slideshow on Progress page — shows transition from starting weight/photo to current weight/photo
- [ ] Show serving amount on food logs in diary page
