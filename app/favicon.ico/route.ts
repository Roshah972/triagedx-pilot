import { NextResponse } from 'next/server'

// Redirect favicon.ico requests to icon.svg
export async function GET() {
  return NextResponse.redirect('/icon.svg', 301)
}

