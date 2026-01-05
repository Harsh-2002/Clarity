/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
    shouldRetry?: (error: any) => boolean
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    shouldRetry = () => true,
  } = options

  let lastError: any
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }

      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms...`)
      
      await new Promise((resolve) => setTimeout(resolve, delay))
      delay = Math.min(delay * backoffFactor, maxDelay)
    }
  }

  throw lastError
}

/**
 * Check if an error is retryable (network errors, rate limits, etc.)
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true
  }

  // HTTP errors that should be retried
  if (error?.status) {
    const status = error.status
    // Retry on 429 (rate limit), 500-599 (server errors)
    return status === 429 || (status >= 500 && status < 600)
  }

  return false
}

/**
 * Enhanced error messages with actionable hints
 */
export function getActionableErrorMessage(error: any, context: "transcription" | "finetune"): string {
  const errorMessage = error?.message || error?.toString() || "Unknown error"
  
  // API Key errors
  if (errorMessage.toLowerCase().includes("unauthorized") || errorMessage.toLowerCase().includes("invalid api key")) {
    return "Your API key appears to be invalid. Please check your settings and update your API key."
  }

  // Rate limit errors
  if (errorMessage.toLowerCase().includes("rate limit") || error?.status === 429) {
    return "You've hit the rate limit. Please wait a moment and try again."
  }

  // Network errors
  if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
    return "Network connection failed. Please check your internet connection and try again."
  }

  // File size errors
  if (errorMessage.toLowerCase().includes("file") && errorMessage.toLowerCase().includes("large")) {
    return "The audio file is too large. Try recording a shorter clip or reduce the file size."
  }

  // Timeout errors
  if (errorMessage.toLowerCase().includes("timeout")) {
    return "The request timed out. This might be due to a long audio file or slow connection. Try again with a shorter recording."
  }

  // Provider-specific errors
  if (context === "transcription") {
    if (errorMessage.includes("audio")) {
      return "There was an issue processing your audio. Make sure it's a valid audio file and try again."
    }
    return `Transcription failed: ${errorMessage}. Please check your audio file and provider settings.`
  }

  if (context === "finetune") {
    return `Refinement failed: ${errorMessage}. The AI service might be temporarily unavailable. Try again in a moment.`
  }

  return errorMessage
}
