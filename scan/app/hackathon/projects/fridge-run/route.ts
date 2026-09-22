import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = url.pathname.startsWith('/hackathon/')
    ? '/hackathon/projects/fridge-run/index.html'
    : '/projects/fridge-run/index.html';
  return NextResponse.redirect(url);
}
