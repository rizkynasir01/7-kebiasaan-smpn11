import {createClient} from '@/lib/supabase/server';
import {NextResponse} from 'next/server';
export async function POST(){return NextResponse.json({error:'Gunakan pengiriman dari halaman utama.'},{status:400})}
