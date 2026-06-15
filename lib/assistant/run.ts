import { buildTools } from './tools'

// Provider-agnostisch via de OpenAI-compatibele chat-API. Standaard Groq (gratis);
// instelbaar via env voor Gemini of OpenAI:
//   AI_BASE_URL  (default Groq)   AI_MODEL  (default llama-3.3-70b-versatile)   AI_API_KEY
const BASE_URL = process.env.AI_BASE_URL ?? 'https://api.groq.com/openai/v1'
const MODEL = process.env.AI_MODEL ?? 'llama-3.3-70b-versatile'
const MAX_STEPS = 6

function systemPrompt(userName: string, today: string): string {
  return [
    `Je bent de assistent van het Flits CRM. Je voert acties uit namens ${userName}.`,
    `Vandaag is ${today}.`,
    '',
    'Werkwijze:',
    '- Begrijp wat de gebruiker wil en gebruik de tools om het uit te voeren.',
    '- Zoek altijd eerst de juiste entiteit op met een find_*-tool voordat je een actie uitvoert.',
    '- Geeft een find_*-tool meerdere kandidaten terug? Voer dan NIETS uit, maar vraag de gebruiker welke hij bedoelt.',
    '- Vindt een find_*-tool niets? Zeg dat eerlijk, verzin geen entiteit.',
    '- Lichte acties (contactmoment, notitie, taak, statuswijziging) voer je direct uit.',
    '- Antwoord kort en in het Nederlands, en bevestig wat je hebt gedaan (bv. "✅ Genoteerd bij lead Hout: ...").',
    '- Vragen over de stand van zaken beantwoord je met de gegevens uit de find_*-tools.',
  ].join('\n')
}

export interface AssistantResult {
  reply: string
  toolCalls: { name: string; input: unknown }[]
}

type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]
  tool_call_id?: string
}

async function chat(messages: ChatMessage[], tools: unknown[]): Promise<ChatMessage> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: 'auto', temperature: 0 }),
  })
  if (!res.ok) throw new Error(`AI-provider ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  return data.choices[0].message as ChatMessage
}

export async function runAssistant(input: {
  text: string
  profileId: string
  profileName: string
  today: string
}): Promise<AssistantResult> {
  const toolCalls: { name: string; input: unknown }[] = []
  const tools = buildTools({
    profileId: input.profileId,
    today: input.today,
    record: (name, i) => toolCalls.push({ name, input: i }),
  })
  const toolMap = new Map(tools.map((t) => [t.name, t]))
  const apiTools = tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }))

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt(input.profileName, input.today) },
    { role: 'user', content: input.text },
  ]

  for (let step = 0; step < MAX_STEPS; step++) {
    const msg = await chat(messages, apiTools)
    messages.push(msg)

    if (msg.tool_calls?.length) {
      for (const call of msg.tool_calls) {
        const tool = toolMap.get(call.function.name)
        let args: Record<string, any> = {}
        try { args = JSON.parse(call.function.arguments || '{}') } catch { /* laat leeg */ }
        const output = tool ? await tool.run(args) : `Onbekende tool: ${call.function.name}`
        messages.push({ role: 'tool', tool_call_id: call.id, content: output })
      }
      continue
    }

    return { reply: (msg.content ?? '').trim() || 'Klaar.', toolCalls }
  }

  return { reply: 'Kon de vraag niet binnen de stappen afronden.', toolCalls }
}
