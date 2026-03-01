import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { phone_number_id, access_token } = await req.json()

    if (!phone_number_id || !access_token) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const url = `https://graph.facebook.com/v18.0/${phone_number_id}?fields=display_phone_number,quality_rating,messaging_limit_tier&access_token=${access_token}`

    const res = await fetch(url)
    const data = await res.json()

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 })
    }

    return NextResponse.json({
      display_phone_number: data.display_phone_number,
      quality_rating: data.quality_rating,
      messaging_limit_tier: data.messaging_limit_tier,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error interno' }, { status: 500 })
  }
}
