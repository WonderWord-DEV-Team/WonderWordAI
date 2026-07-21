import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { childId } = body;

    if (!childId) {
      return NextResponse.json({ error: 'Child ID missing' }, { status: 400 });
    }

    // 1. Fetch the actual reading summary
    const { data: summary, error: summaryError } = await supabase
      .from('child_reading_summary')
      .select('*')
      .eq('child_id', childId)
      .single();

    if (summaryError) throw new Error(`Summary Error: ${summaryError.message}`);

    // 2. Fetch the actual phonics deficits
    const { data: deficits, error: deficitsError } = await supabase
      .from('child_phonics_deficits')
      .select('phonics_category, miscue_count')
      .eq('child_id', childId)
      .limit(3);

    if (deficitsError) throw new Error(`Deficits Error: ${deficitsError.message}`);
    
    // Combine for Claude's prompt
    const studentDataString = JSON.stringify({ summary, top_deficits: deficits });

    // 3. Fetch actual phonics knowledge rules
    const { data: phonicsData, error: phonicsError } = await supabase
      .from('phonics_knowledge')
      .select('category, phonics_rule'); 

    if (phonicsError) throw new Error(`Phonics Error: ${phonicsError.message}`);

    const phonicsRulesString = (phonicsData || [])
      .map(item => `- [${item.category}]: ${item.phonics_rule}`)
      .join('\n');

    // 4. Send to Anthropic API
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: [
        {
          type: "text",
          text: `You are an educational AI co-pilot for K-5 reading. 
Phonics Knowledge Base: 
${phonicsRulesString}

Your task is to write an encouraging, easy-to-understand biweekly reading report narrative for parents based on the child's reading summary and phonics deficits. Return ONLY the narrative text, no extra markdown or pleasantries.`,
          cache_control: { type: "ephemeral" } 
        }
      ],
      messages: [
        {
          role: 'user',
          content: `Generate a biweekly report narrative based on this data: ${studentDataString}`
        }
      ],
    });

    const firstBlock = response.content[0];
    
    if (firstBlock.type !== 'text') {
      throw new Error('Expected a text block from Claude.');
    }

    const reportText = firstBlock.text;
    
    const cycleStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(); 
    const cycleEnd = new Date().toISOString(); 

    // 5. Save the generated report back to the database
    const { error: insertError } = await supabase
      .from('generated_reports')
      .insert({
        child_id: childId,
        narrative_text: reportText,
        cycle_start: cycleStart,
        cycle_end: cycleEnd,
        accuracy_pct: summary.accuracy_pct,
        top_deficits: deficits
      });

    if (insertError) throw new Error(`Insert Error: ${insertError.message}`);

    return NextResponse.json({ 
      success: true, 
      report: reportText
    });

  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}