import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const month = searchParams.get('month')
        const day = searchParams.get('day')

        if (!month || !day) {
            return NextResponse.json({ error: 'Month and Day are required' }, { status: 400 })
        }

        const res = await fetch(`https://today.zenquotes.io/api/${month}/${day}`, {
            headers: {
                'User-Agent': 'Clarity-App/1.0',
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        })

        if (!res.ok) {
            return NextResponse.json({ error: 'Failed to fetch history' }, { status: res.status })
        }

        const data = await res.json()
        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
