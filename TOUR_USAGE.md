# TRIAGEDX Guided Demo Tour - Usage Guide

## Overview

The TRIAGEDX demo tour is a step-by-step walkthrough that guides nurses through the core application flow. It uses overlays, highlights, and tooltips to explain key features.

## How to Start the Tour

### Option 1: URL Parameter (Auto-start)
Add `?demo=1` to any URL:
- `https://your-app.vercel.app/staff/dashboard?demo=1`
- `https://your-app.vercel.app/?demo=1`

The tour will automatically start when the page loads.

### Option 2: Start Demo Tour Button
1. Navigate to the Nurse Console (`/staff/dashboard`)
2. Click the **"Start Demo Tour"** button in the header
3. The tour will begin from the intro screen

### Option 3: Replay Demo Button
1. On the Nurse Console, click **"Replay Demo"** (small button next to Start Demo Tour)
2. This clears the "seen" flag and restarts the tour

## Tour Steps

The tour follows this sequence:

1. **Intro** - Welcome screen explaining the demo
2. **Nurse Console** - Overview of the patient list view
3. **Check-In Entry** - Highlighting the check-in button
4. **Check-In Overview** - Introduction to the form
5. **Demographics** - Explaining the demographics section
6. **Chief Complaint** - Explaining complaint selection
7. **Symptoms/Vitals** - Explaining symptom questions
8. **Submit** - Highlighting the submit button
9. **Back to Console** - Navigation back to dashboard
10. **New Patient Highlight** - Showing the newly created patient
11. **Wrap-Up** - Final summary and feedback request

## Controls

- **Next** - Advance to the next step
- **Skip Demo** - Exit the tour (available on most steps)
- **ESC Key** - Exit the tour at any time
- **Close (×)** - Exit the tour (top-right of tooltip)

## Technical Details

### Tour IDs

Elements are marked with `data-tour-id` attributes:

- `nurse-console` - Nurse Dashboard header
- `checkin-entry` - Check-in button/link
- `checkin-overview` - Check-in form header
- `checkin-demographics` - Demographics section
- `checkin-complaint` - Chief complaint section
- `checkin-vitals` - Symptoms/vitals section
- `checkin-submit` - Submit button
- `new-patient-highlight` - Newly created patient card

### Adding New Tour Steps

1. Add a new step ID to `TourStep` type in `contexts/DemoTourContext.tsx`
2. Add step configuration to `tourSteps` object in `components/DemoTour.tsx`
3. Add `data-tour-id="your-step-id"` to the target element
4. Update the step order array in `DemoTourContext.tsx`

### Example: Adding a Step

```tsx
// 1. Add to TourStep type
export type TourStep = 
  | 'intro'
  | 'your-new-step'
  | 'wrap-up'

// 2. Add configuration
const tourSteps: Record<string, {...}> = {
  'your-new-step': {
    title: 'Your Step Title',
    body: 'Explanation text here',
    placement: 'bottom',
  },
  // ...
}

// 3. Add to step order
const stepOrder: TourStep[] = [
  'intro',
  'your-new-step',
  'wrap-up',
]

// 4. Add data-tour-id to element
<div data-tour-id="your-new-step">
  Your content
</div>
```

## Local Storage

The tour uses `localStorage` to track if a user has seen the demo:
- Key: `triagedx_demo_seen`
- Value: `"true"` when tour is completed or skipped

To reset (for testing):
```javascript
localStorage.removeItem('triagedx_demo_seen')
```

## Styling

Tour styles are in `components/TourOverlay.module.css`:
- `.backdrop` - Dark overlay background
- `.tourHighlight` - Highlighted element styling
- `.tooltip` - Tooltip container
- `.introOverlay` - Full-screen intro/wrap-up overlay

## Navigation Handling

The tour automatically navigates between pages:
- `checkin-entry` → navigates to `/check-in`
- `back-to-console` → navigates to `/staff/dashboard`
- `nurse-console` → ensures `/staff/dashboard` is active

## Troubleshooting

### Tour doesn't start
- Check browser console for errors
- Verify `DemoTourProvider` is in `app/layout.tsx`
- Check that `TourProviderWrapper` wraps children

### Tooltip positioning is off
- Ensure target element has `data-tour-id` attribute
- Check that element is visible when step activates
- Tooltip recalculates on window resize

### Navigation doesn't work
- Verify `useRouter` from `next/navigation` is used
- Check that tour step matches expected route
- Ensure navigation happens after DOM updates

## Files Modified

- `app/layout.tsx` - Added TourProviderWrapper
- `app/staff/dashboard/page.tsx` - Added tour IDs and buttons
- `app/check-in/page.tsx` - Added tour IDs to form sections
- `app/page.tsx` - Added tour ID to check-in link
- `contexts/DemoTourContext.tsx` - Tour state management
- `components/DemoTour.tsx` - Main tour component
- `components/TourOverlay.tsx` - Overlay and tooltip rendering
- `components/TourProviderWrapper.tsx` - Provider wrapper

## Future Enhancements

Potential improvements:
- Add step progress indicator (e.g., "Step 3 of 11")
- Add keyboard navigation (arrow keys)
- Add tour analytics (which steps users skip)
- Add conditional steps based on user role
- Add tour completion badge/certificate


