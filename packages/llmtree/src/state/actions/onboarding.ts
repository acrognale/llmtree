import { produce } from 'immer'

import { ActionCreator, State } from '@/state/state'

export type OnboardingActions = {
  completeOnboarding: () => void
  updateOnboardingCompleted: (completed: boolean) => void
}

export const onboardingActions: ActionCreator<OnboardingActions> = (set) => ({
  completeOnboarding: () => {
    set(
      produce((state: State) => {
        state.onboardingCompleted = true
      })
    )
  },
  updateOnboardingCompleted: (completed: boolean) => {
    set(
      produce((state: State) => {
        state.onboardingCompleted = completed
      })
    )
  },
})
