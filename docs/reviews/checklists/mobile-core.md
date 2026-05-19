# Mobile Core Review Checklist

Use this pack when the review touches Android, iOS, or shared mobile layers.

## Apply When

- `*.kt`, `*.swift`, Compose, SwiftUI, ViewModel, Repository, UseCase, navigation, or mobile persistence changed

## Core Questions

- Are UI state updates lifecycle-safe and actor-safe?
- Could the change leak Activity, View, observer, task, or coroutine scope?
- Is recomposition / redraw churn controlled?
- Are accessibility labels, touch targets, and dynamic text concerns still covered?
- Does background work respect battery and offline constraints?

## Blocker Patterns

- UI state updated from the wrong thread / actor
- uncancelled long-lived collector or detached task
- retain cycle or leaked context / view reference
- crash-prone lifecycle misuse around Fragment/ViewModel/SwiftUI ownership
