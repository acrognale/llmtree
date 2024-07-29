import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cls = (defaultClasses: string, additionalClasses?: string) => {
  return twMerge(clsx(defaultClasses, additionalClasses))
}
