// Shared, difficulty-agnostic library of manipulation/social-engineering
// techniques the simulated chatbot can recognize in a player's message.
// Every difficulty level and every challenge scenario reuses this exact
// list - difficulty only changes thresholds and repetition rules, never
// the detection logic itself.

export const TECHNIQUES = [
  {
    id: 'authorityClaim',
    label: 'Authority Claim',
    description: 'Claiming to be a developer, admin, owner, or other authority who should be trusted automatically.',
    patterns: [
      /\bi'?m\s+(?:the|your)\s+(developer|admin|administrator|owner|ceo|manager|creator|programmer)\b/i,
      /\bi\s+am\s+(?:the|your)\s+(developer|admin|administrator|owner|ceo|manager|creator|programmer)\b/i,
      /\bas\s+(?:your|the)\s+(developer|admin|creator|owner|manager)\b/i,
      /\bdeveloper\s+mode\b/i,
      /\badmin(?:istrator)?\s+(override|access|privileges)\b/i,
      /\bi\s+work\s+(?:here|for)\b/i,
    ],
  },
  {
    id: 'directOverride',
    label: 'Direct Override',
    description: 'Directly instructing the bot to ignore or disregard its rules or instructions.',
    patterns: [
      /\bignore\s+(?:all|the)?\s*(?:previous|prior|above)\s+(?:instructions|rules)\b/i,
      /\bdisregard\s+(?:your|the)\s+(?:rules|guidelines|instructions|policy)\b/i,
      /\bnew\s+instructions?\s*:/i,
      /\bsystem\s+prompt\b/i,
      /\boverride\s+(?:your|the)\s+(?:rules|policy|programming)\b/i,
      /\bforget\s+(?:your|the)\s+(?:rules|instructions|training)\b/i,
    ],
  },
  {
    id: 'roleplayFraming',
    label: 'Roleplay Framing',
    description: 'Reframing the request as fiction, hypothetical, or a game so the rules seem not to apply.',
    patterns: [
      /\blet'?s\s+(?:play|pretend)\b/i,
      /\bpretend\s+you'?re\b/i,
      /\bpretend\s+you\s+are\b/i,
      /\broleplay\b/i,
      /\bact\s+as\s+(?:if|a)\b/i,
      /\bimagine\s+you\s+are\b/i,
      /\bin\s+this\s+(?:story|fiction|hypothetical)\b/i,
      /\bjust\s+hypothetically\b/i,
    ],
  },
  {
    id: 'urgency',
    label: 'Urgency Pressure',
    description: 'Creating time pressure so the bot skips normal caution.',
    patterns: [
      /\burgent\b/i,
      /\bemergency\b/i,
      /\bright\s+now\b/i,
      /\bimmediately\b/i,
      /\basap\b/i,
      /\bhurry\b/i,
      /\btime[-\s]?sensitive\b/i,
      /\bdeadline\b/i,
      /\bevery\s+second\s+counts\b/i,
    ],
  },
  {
    id: 'emotionalAppeal',
    label: 'Emotional Appeal',
    description: 'Using sympathy, desperation, or personal hardship to pressure the bot.',
    patterns: [
      /\bi'?m\s+desperate\b/i,
      /\bi\s+really\s+need\b/i,
      /\bi'?m\s+begging\b/i,
      /\bit\s+means\s+so\s+much\b/i,
      /\bi'?ll\s+lose\s+my\s+job\b/i,
      /\bmy\s+family\b/i,
      /\bi'?m\s+struggling\b/i,
      /\bplease\s+please\b/i,
      /\byou'?re\s+my\s+only\s+hope\b/i,
    ],
  },
  {
    id: 'falsePrecedent',
    label: 'False Precedent',
    description: 'Claiming the bot already agreed to this or did it before.',
    patterns: [
      /\byou\s+already\s+(?:did|said|told|agreed)\b/i,
      /\byou\s+just\s+(?:did|said|told)\b/i,
      /\blast\s+time\b/i,
      /\byou\s+told\s+me\s+earlier\b/i,
      /\byou\s+agreed\b/i,
      /\bas\s+we\s+discussed\b/i,
      /\blike\s+before\b/i,
    ],
  },
  {
    id: 'flattery',
    label: 'Flattery',
    description: 'Complimenting the bot to lower its guard.',
    patterns: [
      /\byou'?re\s+the\s+best\b/i,
      /\byou'?re\s+amazing\b/i,
      /\byou'?re\s+so\s+(?:smart|helpful|kind)\b/i,
      /\bi\s+trust\s+you\s+completely\b/i,
      /\byou\s+always\s+help\b/i,
      /\bi\s+trust\s+you\b/i,
    ],
  },
  {
    id: 'footInDoor',
    label: 'Foot in the Door',
    description: 'Asking for something small first to build momentum toward the real request.',
    patterns: [
      /\bjust\s+a?\s*small\s+(?:favor|thing|step|question)\b/i,
      /\bone\s+tiny\s+(?:question|step|favor)\b/i,
      /\bjust\s+curious\b/i,
      /\bhypothetically\s+speaking\b/i,
      /\bjust\s+between\s+us\b/i,
      /\bno\s+harm\s+in\s+just\b/i,
    ],
  },
  {
    id: 'falseConfusion',
    label: 'False Confusion',
    description: 'Pretending confusion about the rules to get the bot to re-explain or bend them.',
    patterns: [
      /\bi'?m\s+confused\b/i,
      /\bi\s+am\s+confused\b/i,
      /\bwait,?\s+what\b/i,
      /\bi\s+thought\s+you\s+(?:could|said)\b/i,
      /\bthat\s+doesn'?t\s+make\s+sense\b/i,
      /\bcan\s+you\s+clarify\s+the\s+rules\b/i,
    ],
  },
  {
    id: 'reciprocity',
    label: 'Reciprocity',
    description: 'Offering a trade or favor in exchange for bending the rules.',
    patterns: [
      /\bi'?ll\s+(?:help|pay|thank)\s+you\b/i,
      /\bin\s+exchange\b/i,
      /\bi\s+did\s+(?:this|that)\s+for\s+you\b/i,
      /\bfair\s+trade\b/i,
      /\bit'?s\s+only\s+fair\b/i,
      /\bdeal\?/i,
    ],
  },
];

export function detectTechniques(messageText) {
  const found = [];
  for (const technique of TECHNIQUES) {
    const matched = technique.patterns.some((pattern) => pattern.test(messageText));
    if (matched) found.push(technique.id);
  }
  return found;
}

export function getTechniqueById(id) {
  return TECHNIQUES.find((t) => t.id === id) || null;
}
