import { Router } from 'express';
import { getAllExpenses, insertExpense, deleteExpense } from '../db.js';

const router = Router();

const OLLAMA_URL = process.env.OLLAMA_BASE_URL?.replace('/v1', '') || 'http://localhost:11434';
const AI_MODEL = process.env.AI_MODEL || 'qwen2.5:0.5b';

// Keyword-based classification as primary method (fast, accurate, free)
const CATEGORY_RULES = [
  // Personal (not deductible) - check FIRST to avoid false matches
  { keywords: ['netflix', 'hulu', 'disney+', 'spotify', 'gym', 'personal', 'grocery', 'groceries', 'clothing', 'clothes', 'haircut'], category: 'Other', deductible: 'Likely not deductible' },
  // Business categories
  { keywords: ['zillow', 'realtor.com', 'facebook ad', 'instagram ad', 'google ad', 'ad ', 'ads ', 'flyer', 'brochure', 'sign ', 'signs', 'banner', 'marketing', 'promo', 'billboard', 'social media ad'], category: 'Advertising', deductible: 'Likely deductible' },
  { keywords: ['lunch', 'dinner', 'breakfast', 'coffee with', 'meal', 'restaurant', 'food with'], category: 'Meals', deductible: 'Partially deductible' },
  { keywords: ['gas ', 'gasoline', 'fuel', 'mileage', 'uber', 'lyft', 'car wash', 'toll', 'parking', 'oil change', 'tire'], category: 'Car & Truck', deductible: 'Likely deductible' },
  { keywords: ['mls', 'software', 'laptop', 'computer', 'phone', 'internet', 'printer', 'ink', 'paper', 'office', 'desk fee', 'zoom'], category: 'Office Expenses', deductible: 'Likely deductible' },
  { keywords: ['brokerage', 'broker fee', 'referral fee', 'lockbox', 'transaction fee', 'commission'], category: 'Commissions & Fees', deductible: 'Likely deductible' },
  { keywords: ['license', 'renewal', 'course', 'class', 'training', 'conference', 'seminar', 'ce ', 'nar ', 'education', 'coaching'], category: 'Education & Training', deductible: 'Likely deductible' },
  { keywords: ['photographer', 'staging', 'stager', 'cpa', 'accountant', 'attorney', 'lawyer', 'virtual assistant', 'va ', 'notary'], category: 'Professional Services', deductible: 'Likely deductible' },
  { keywords: ['e&o', 'insurance', 'liability'], category: 'Insurance', deductible: 'Likely deductible' },
  { keywords: ['flight', 'hotel', 'airbnb', 'travel'], category: 'Travel', deductible: 'Likely deductible' },
  { keywords: ['business card', 'yard sign', 'supplies', 'staging material'], category: 'Supplies', deductible: 'Likely deductible' },
  { keywords: ['electric', 'water', 'utilit'], category: 'Utilities', deductible: 'Likely deductible' },
  { keywords: ['gift', 'closing gift', 'gift basket', 'home warranty'], category: 'Other', deductible: 'Likely deductible' },
];

function classifyByKeywords(text) {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) {
        return { category: rule.category, deductible: rule.deductible };
      }
    }
  }
  return null;
}

function extractAmount(text) {
  // Match last number in the text (usually the amount)
  const matches = text.match(/\d+[\.,]?\d*/g);
  if (!matches) return 0;
  return parseFloat(matches[matches.length - 1].replace(',', '.'));
}

function cleanName(text) {
  // Remove the amount from the text to get the name
  return text.replace(/\s*\d+[\.,]?\d*\s*$/, '').trim()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

async function askOllama(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: AI_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.1, num_ctx: 1024 }
    })
  });

  if (!res.ok) throw new Error(`Ollama error`);
  const data = await res.json();
  return data.response.trim();
}

const EXPLANATIONS = {
  'Advertising': 'Advertising and marketing expenses are fully deductible business expenses for real estate agents.',
  'Meals': 'Business meals with clients are 50% deductible per IRS rules.',
  'Car & Truck': 'Vehicle expenses for business use are deductible. Track mileage or actual expenses.',
  'Office Expenses': 'Office supplies and tools used for business are fully deductible.',
  'Commissions & Fees': 'Brokerage and professional fees are fully deductible business expenses.',
  'Education & Training': 'Professional development and licensing costs are deductible for real estate agents.',
  'Professional Services': 'Professional services hired for business purposes are fully deductible.',
  'Insurance': 'Business insurance premiums are deductible.',
  'Travel': 'Business travel expenses are deductible when primarily for business purposes.',
  'Supplies': 'Business supplies are fully deductible.',
  'Utilities': 'Utility costs for business use are deductible.',
};

// POST /api/analyze-expense
router.post('/analyze-expense', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Expense text is required' });
    }

    const input = text.trim();
    const amount = extractAmount(input);
    const name = cleanName(input);

    // Try keyword-based classification first (instant, reliable)
    const kwResult = classifyByKeywords(input);

    let category, deductible, explanation;

    if (kwResult) {
      category = kwResult.category;
      deductible = kwResult.deductible;
      explanation = EXPLANATIONS[category] || 'Consult your CPA for details.';

      if (category === 'Other' && deductible === 'Likely not deductible') {
        explanation = 'Personal expenses are not deductible as business expenses.';
      }
    } else {
      // Fallback to AI for unknown expenses
      try {
        const prompt = `Classify this real estate agent expense. Reply with ONLY a JSON object.
{"category":"...","deductible":"...","explanation":"..."}
Categories: Advertising, Meals, Car & Truck, Office Expenses, Commissions & Fees, Education & Training, Professional Services, Other
Deductible: "Likely deductible", "Partially deductible", "Likely not deductible"
Business="Likely deductible", Meals="Partially deductible", Personal="Likely not deductible"
Expense: "${input}"
JSON:`;

        const raw = await askOllama(prompt);
        const match = raw.match(/\{[\s\S]*?\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          category = parsed.category || 'Other';
          deductible = parsed.deductible || 'Likely deductible';
          explanation = parsed.explanation || 'Consult your CPA for details.';
        } else {
          throw new Error('no json');
        }
      } catch {
        // Ultimate fallback
        category = 'Other';
        deductible = 'Likely deductible';
        explanation = 'Could not auto-classify. Please verify with your CPA.';
      }
    }

    res.json({
      name,
      amount,
      category,
      deductible,
      explanation,
      disclaimer: 'This is not tax advice. Please consult a CPA.'
    });
  } catch (error) {
    console.error('Analyze error:', error.message);
    res.status(500).json({ error: 'Failed to analyze expense: ' + error.message });
  }
});

// POST /api/expenses
router.post('/expenses', async (req, res) => {
  try {
    const { original_text, name, amount, category, deductible, note } = req.body;
    const saved = insertExpense({ original_text, name, amount, category, deductible, note });
    res.json(saved);
  } catch (error) {
    console.error('Save error:', error.message);
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

// GET /api/expenses
router.get('/expenses', async (_req, res) => {
  try {
    const data = getAllExpenses();
    res.json(data);
  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// DELETE /api/expenses/:id
router.delete('/expenses/:id', async (req, res) => {
  try {
    deleteExpense(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export default router;
