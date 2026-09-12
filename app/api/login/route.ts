import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Get credentials from environment variables
    const validUsername = process.env.APP_USERNAME || "admin";
    const validPassword = process.env.APP_PASSWORD || "admin123";

    if (username === validUsername && password === validPassword) {
      return NextResponse.json({
        success: true,
        user: { username }
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
