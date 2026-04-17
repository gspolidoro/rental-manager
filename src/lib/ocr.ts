export interface ReceiptData {
  date: string | null
  merchant: string | null
  amount: number | null
  type: 'income' | 'expense' | null
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function extractReceiptData(file: File): Promise<ReceiptData> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey || !file.type.startsWith('image/')) {
    return { date: null, merchant: null, amount: null, type: null }
  }

  const base64 = await fileToBase64(file)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: file.type, data: base64 },
          },
          {
            type: 'text',
            text: `Extract from this receipt image:
1. date — in YYYY-MM-DD format
2. merchant — store or vendor name
3. amount — the total amount paid (number only, no currency symbol)
4. type — "expense" for purchases/bills, "income" for payments received

Respond with JSON only, no explanation:
{"date": "YYYY-MM-DD", "merchant": "Store Name", "amount": 123.45, "type": "expense"}

Use null for any field you cannot determine with confidence.`,
          },
        ],
      }],
    }),
  })

  if (!response.ok) return { date: null, merchant: null, amount: null, type: null }

  const data = await response.json()
  const text: string = data.content?.[0]?.text ?? ''

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { date: null, merchant: null, amount: null, type: null }
    const parsed = JSON.parse(match[0])
    return {
      date: typeof parsed.date === 'string' ? parsed.date : null,
      merchant: typeof parsed.merchant === 'string' ? parsed.merchant : null,
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      type: parsed.type === 'income' || parsed.type === 'expense' ? parsed.type : null,
    }
  } catch {
    return { date: null, merchant: null, amount: null, type: null }
  }
}
