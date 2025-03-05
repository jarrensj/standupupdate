// pages/api/format-note.js
import { NextResponse } from 'next/server';
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'No text provided' },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Format this daily standup note by: 1) Organizing it into 'Completed', 'In Progress', and 'Blockers' sections, 2) Bullet-pointing key items, 3) Removing filler words and making language concise, 4) Correcting any grammar issues, 5) Maintaining all technical details and important information."
        },
        {
          role: "user",
          content: text
        }
      ],
    });

    const formattedText = completion.choices[0].message.content;

    return NextResponse.json({ formattedText });
    
  } catch (error) {
    console.error('Note formatting error:', error);
    return NextResponse.json(
      { error: 'Failed to format note' },
      { status: 500 }
    );
  }
}
