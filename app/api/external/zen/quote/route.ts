import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const res = await fetch('https://zenquotes.io/api/random', {
            headers: {
                'User-Agent': 'Clarity-App/1.0',
            },
            next: { revalidate: 0 }
        })

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch quote' }, { status: res.status })
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
