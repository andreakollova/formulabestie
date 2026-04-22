// Basic content filter — blocks or flags violent / very vulgar text
// Not exhaustive — acts as a first layer of protection

const BLOCKED = [
  // English
  'fuck', 'shit', 'cunt', 'nigger', 'faggot', 'kill yourself', 'kys',
  'rape', 'go die', 'i will kill', 'i\'ll kill',
  // Slovak / Czech common vulgar
  'piča', 'pica', 'kurva', 'kurvaa', 'jebat', 'jebem', 'seru na',
  'zabiem', 'zabij sa', 'do piče', 'do pice', 'picovina',
  'kokot', 'zkurvený', 'zkurveny', 'debil', 'idiot retard',
  // Hate / slurs (partial list)
  'whore', 'slut', 'bitch ass', 'retard',
]

export function filterMessage(text: string): { ok: boolean; reason?: string } {
  const lower = text.toLowerCase()
  for (const word of BLOCKED) {
    if (lower.includes(word)) {
      return { ok: false, reason: 'This message contains language that\'s not allowed here.' }
    }
  }
  return { ok: true }
}
