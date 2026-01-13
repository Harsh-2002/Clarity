import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const FALLBACK_QUOTES = [
    { q: "The only way to do great work is to love what you do.", a: "Steve Jobs" },
    { q: "In the middle of difficulty lies opportunity.", a: "Albert Einstein" },
    { q: "Simplicity is the ultimate sophistication.", a: "Leonardo da Vinci" },
    { q: "The journey of a thousand miles begins with a single step.", a: "Lao Tzu" },
    { q: "What you think, you become.", a: "Buddha" },
    { q: "The only limit to our realization of tomorrow is our doubts of today.", a: "Franklin D. Roosevelt" },
    { q: "Do what you can, with what you have, where you are.", a: "Theodore Roosevelt" },
    { q: "Turn your wounds into wisdom.", a: "Oprah Winfrey" },
]

export async function GET() {
    try {
        const res = await fetch('https://zenquotes.io/api/random', {
            headers: {
                'User-Agent': 'Clarity-App/1.0',
            },
            next: { revalidate: 0 }
        })

        if (!res.ok) {
            // Return a fallback quote
            const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
            return NextResponse.json([fallback])
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch (error) {
        // Return a fallback quote on any error
        const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
        return NextResponse.json([fallback])
    }
}
