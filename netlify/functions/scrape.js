const fetch = require('node-fetch');

// Industry mapping for better search targeting
const INDUSTRY_MAPPING = {
  technology: [
    "Software Engineer", "Developer", "Data Scientist", "Product Manager", 
    "CTO", "Software Architect", "DevOps Engineer", "AI Engineer",
    "Machine Learning Engineer", "Cloud Architect", "IT Manager"
  ],
  healthcare: [
    "Doctor", "Physician", "Surgeon", "Medical Director", "Healthcare Manager",
    "Nurse Practitioner", "Pharmacist", "Medical Researcher", "Hospital Administrator"
  ],
  finance: [
    "Financial Analyst", "Investment Banker", "Portfolio Manager", "CFO",
    "Accountant", "Financial Advisor", "Risk Manager", "Wealth Manager"
  ],
  education: [
    "Professor", "Teacher", "Educator", "Academic Dean", "School Principal",
    "Researcher", "Education Director", "Curriculum Developer"
  ],
  manufacturing: [
    "Production Manager", "Operations Manager", "Quality Engineer",
    "Supply Chain Manager", "Manufacturing Engineer", "Plant Manager"
  ],
  retail: [
    "Store Manager", "Retail Manager", "Sales Manager", "Merchandising Manager",
    "E-commerce Manager", "Brand Manager", "Marketing Manager"
  ],
  real_estate: [
    "Real Estate Agent", "Property Manager", "Real Estate Broker",
    "Commercial Real Estate", "Real Estate Developer"
  ],
  energy: [
    "Energy Engineer", "Renewable Energy Specialist", "Oil and Gas Engineer",
    "Sustainability Manager", "Environmental Engineer"
  ]
};

exports.handler = async function(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { designation, location, leadCount, industry } = JSON.parse(event.body);
    
    console.log('Received search request:', { designation, location, leadCount, industry });
    
    if (!designation || !location) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Designation and location are required' })
      };
    }

    // Check environment variables
    const oxyUsername = process.env.OXYLABS_USERNAME;
    const oxyPassword = process.env.OXYLABS_PASSWORD;
    
    if (!oxyUsername || !oxyPassword) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Oxylabs credentials not configured'
        })
      };
    }

    // Build enhanced search query with industry filtering
    const searchQuery = buildIndustrySearchQuery(designation, location, industry);
    const limit = leadCount || 10;
    
    console.log('Enhanced search query:', searchQuery);
    
    const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(`${oxyUsername}:${oxyPassword}`).toString('base64')
      },
      body: JSON.stringify({
        source: 'google_search',
        query: searchQuery,
        parse: true,
        limit: limit,
        context: [
          { key: 'follow_redirects', value: true },
          { key: 'location', value: location }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Oxylabs API error:', errorText);
      throw new Error(`Oxylabs API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Oxylabs API success, data received');
    
    const profiles = extractLinkedInProfiles(data, designation, location, industry);
    
    console.log(`Extracted ${profiles.length} LinkedIn profiles for industry: ${industry}`);
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        profiles: profiles,
        count: profiles.length,
        industry: industry,
        source: 'oxylabs_enhanced'
      })
    };

  } catch (error) {
    console.error('Enhanced scraping error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        error: `Enhanced search failed: ${error.message}`
      })
    };
  }
};

function buildIndustrySearchQuery(designation, location, industry) {
  let baseQuery = `site:linkedin.com/in "${designation}" "${location}"`;
  
  // Add industry-specific terms for better targeting
  if (industry && industry !== 'all' && INDUSTRY_MAPPING[industry]) {
    const industryTerms = INDUSTRY_MAPPING[industry];
    // Add a few key industry terms to the search
    const additionalTerms = industryTerms.slice(0, 3).map(term => `"${term}"`).join(' OR ');
    baseQuery += ` (${additionalTerms})`;
  }
  
  return baseQuery;
}

function extractLinkedInProfiles(oxylabsData, designation, location, industry) {
  const profiles = [];
  
  if (!oxylabsData.results || !Array.isArray(oxylabsData.results) || oxylabsData.results.length === 0) {
    return profiles;
  }

  const firstResult = oxylabsData.results[0];
  
  if (!firstResult.content || !firstResult.content.results || !firstResult.content.results.organic) {
    return profiles;
  }

  const organicResults = firstResult.content.results.organic;
  
  organicResults.forEach((result, index) => {
    if (result.url && result.url.includes('linkedin.com/in/')) {
      const profile = {
        id: index + 1,
        name: extractNameFromTitle(result.title),
        title: designation,
        company: extractCompanyFromSnippet(result.snippet) || 'LinkedIn Profile',
        location: location,
        industry: industry || 'general',
        profileUrl: result.url,
        email: null,
        phone: null,
        snippet: result.snippet,
        apolloEnriched: false,
        confidence: 'low',
        relevanceScore: calculateIndustryRelevance(result, industry)
      };
      
      profiles.push(profile);
    }
  });

  // Sort by relevance score
  return profiles.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

function calculateIndustryRelevance(result, industry) {
  if (!industry || industry === 'all') return 5; // Default score for general search
  
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  let score = 0;
  
  const industryKeywords = {
    technology: ['software', 'tech', 'developer', 'engineer', 'data', 'cloud', 'ai', 'machine learning'],
    healthcare: ['health', 'medical', 'hospital', 'doctor', 'patient', 'clinical', 'pharma'],
    finance: ['finance', 'bank', 'investment', 'financial', 'wealth', 'accounting', 'tax'],
    education: ['education', 'university', 'school', 'teacher', 'professor', 'academic'],
    manufacturing: ['manufacturing', 'production', 'factory', 'supply chain', 'operations'],
    retail: ['retail', 'store', 'sales', 'merchandise', 'e-commerce', 'customer'],
    real_estate: ['real estate', 'property', 'realtor', 'broker', 'commercial'],
    energy: ['energy', 'renewable', 'solar', 'wind', 'oil', 'gas', 'power']
  };
  
  const keywords = industryKeywords[industry] || [];
  keywords.forEach(keyword => {
    if (text.includes(keyword)) score += 2;
  });
  
  return Math.min(score, 10); // Cap at 10
}

function extractNameFromTitle(title) {
  if (!title) return 'Unknown Name';
  
  const patterns = [
    /(.*?) - (.*?) \| LinkedIn/,
    /(.*?) \| LinkedIn/,
    /(.*?) on LinkedIn: (.*)/
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return title.replace(' | LinkedIn', '')
             .replace(' on LinkedIn', '')
             .replace(' - LinkedIn', '')
             .trim();
}

function extractCompanyFromSnippet(snippet) {
  if (!snippet) return null;
  
  const companyPatterns = [
    /at\s+([^.,]+)/i,
    /,\s+([^.,]+)/i,
    /from\s+([^.,]+)/i
  ];
  
  for (const pattern of companyPatterns) {
    const match = snippet.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}