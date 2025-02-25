import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const user_id = searchParams.get('user_id');
  const start_date = searchParams.get('start_date');

  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  let query = supabase
    .from('standupupdates')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (start_date) {
    query = query.gte('date', start_date);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { text, user_id, date } = body;

  if (!text || !user_id || !date) {
    return NextResponse.json({ error: 'text, user_id, and date are required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('standupupdates')
    .insert([{
      text,
      user_id,
      date,
      created_at: new Date().toISOString()
    }]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, text, user_id, date } = body;

  if (!id || !text || !user_id || !date) {
    return NextResponse.json({ error: 'id, text, user_id, and date are required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('standupupdates')
    .update({ 
      text,
      date,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const user_id = searchParams.get('user_id');

  if (!id || !user_id) {
    return NextResponse.json({ error: 'id and user_id are required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('standupupdates')
    .delete()
    .eq('id', id)
    .eq('user_id', user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
} 