export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) {
    return 'Just now'
  } else if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'} ago`
  } else if (hours < 24) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  } else if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  } else if (weeks < 4) {
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
  } else if (months < 12) {
    return `${months} ${months === 1 ? 'month' : 'months'} ago`
  } else {
    return `${years} ${years === 1 ? 'year' : 'years'} ago`
  }
}

export function getWordCount(html: string): number {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, ' ')
  // Remove extra whitespace
  const cleaned = text.replace(/\s+/g, ' ').trim()
  // Count words
  return cleaned.length === 0 ? 0 : cleaned.split(' ').length
}

export function getCharacterCount(html: string): number {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, '')
  return text.trim().length
}
