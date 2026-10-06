import type { Flashcard, ReviewRating } from '../types'

const MINUTE = 60_000
const DAY_MINUTES = 24 * 60

export interface ReviewSchedule {
  nextReviewAt: string
  reviewIntervalMinutes: number
  reviewEase: number
  reviewRepetitions: number
}

function roundInterval(minutes: number) {
  return Math.max(10, Math.round(minutes))
}

export function calculateReviewSchedule(
  card: Flashcard,
  rating: ReviewRating,
  now = new Date(),
): ReviewSchedule {
  const previousInterval = Math.max(0, card.reviewIntervalMinutes ?? 0)
  const previousEase = Math.max(1.3, card.reviewEase ?? 2.5)
  const previousRepetitions = Math.max(0, card.reviewRepetitions ?? 0)

  let intervalMinutes: number
  let ease = previousEase
  let repetitions = previousRepetitions

  switch (rating) {
    case 'again':
      intervalMinutes = 10
      ease = Math.max(1.3, previousEase - 0.2)
      repetitions = 0
      break
    case 'hard':
      intervalMinutes = previousInterval > 0
        ? Math.max(DAY_MINUTES, previousInterval * 1.2)
        : DAY_MINUTES
      ease = Math.max(1.3, previousEase - 0.15)
      repetitions = Math.max(1, previousRepetitions)
      break
    case 'good':
      if (previousRepetitions === 0) intervalMinutes = DAY_MINUTES
      else if (previousRepetitions === 1) intervalMinutes = 3 * DAY_MINUTES
      else intervalMinutes = Math.max(DAY_MINUTES, previousInterval) * previousEase
      repetitions = previousRepetitions + 1
      break
    case 'easy':
      intervalMinutes = previousRepetitions === 0
        ? 4 * DAY_MINUTES
        : Math.max(DAY_MINUTES, previousInterval) * previousEase * 1.3
      ease = previousEase + 0.15
      repetitions = previousRepetitions + 1
      break
  }

  intervalMinutes = roundInterval(intervalMinutes)

  return {
    nextReviewAt: new Date(now.getTime() + intervalMinutes * MINUTE).toISOString(),
    reviewIntervalMinutes: intervalMinutes,
    reviewEase: Number(ease.toFixed(2)),
    reviewRepetitions: repetitions,
  }
}

export function isCardDue(card: Flashcard, now = new Date()) {
  if (!card.nextReviewAt) return true
  const due = new Date(card.nextReviewAt).getTime()
  return Number.isNaN(due) || due <= now.getTime()
}

export function formatReviewInterval(minutes: number) {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`
  if (minutes < DAY_MINUTES) return `${Math.round(minutes / 60)}h`
  const days = minutes / DAY_MINUTES
  if (days < 30) return `${Math.round(days)}d`
  const months = days / 30
  if (months < 12) return `${Math.round(months)}mo`
  return `${(days / 365).toFixed(1)}y`
}

export function getReviewIntervalPreview(card: Flashcard, rating: ReviewRating) {
  return formatReviewInterval(calculateReviewSchedule(card, rating, new Date(0)).reviewIntervalMinutes)
}
