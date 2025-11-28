const fetch = require('node-fetch');

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
    const { profiles } = JSON.parse(event.body);

    if (!profiles || !Array.isArray(profiles)) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Profiles array is required' })
      };
    }

    const apolloApiKey = process.env.APOLLO_API_KEY;
    
    // If no real Apollo key, use enhanced mock data
    if (!apolloApiKey || apolloApiKey === '5ESQT2-f3ArLCtgWeH6snw') {
      const enriched = profiles.map((profile, index) => {
        const hasContact = index < Math.min(5, profiles.length);
        const email = hasContact ? generateRealisticEmail(profile.name, profile.company) : null;
        
        return {
          ...profile,
          apolloEnriched: hasContact,
          verifiedEmail: email,
          directPhone: hasContact ? generateRealisticPhone(index) : null,
          confidence: hasContact ? 'medium' : 'low',
          hasEmail: !!email,
          hasDirectPhone: hasContact,
          emailAccuracy: hasContact ? 'estimated' : 'none',
          note: 'Add real APOLLO_API_KEY for verified contact data'
        };
      });
      
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          profiles: enriched,
          note: 'Add real APOLLO_API_KEY in Netlify environment variables for verified contact enrichment'
        })
      };
    }

    // REAL APOLLO ENRICHMENT WITH EMAIL OPTIMIZATION
    console.log('Using enhanced Apollo enrichment with email optimization');
    
    const enrichedProfiles = [];
    
    for (const profile of profiles.slice(0, 8)) { // Reduced for better quality
      try {
        console.log(`Enriching: ${profile.name} at ${profile.company}`);
        
        // STRATEGY 1: Direct enrichment with company domain
        const enrichmentResult = await enhanceWithApollo(profile, apolloApiKey);
        
        // STRATEGY 2: If email is low confidence, try alternative approaches
        if (enrichmentResult.apolloEnriched && (!enrichmentResult.verifiedEmail || enrichmentResult.emailAccuracy === 'low')) {
          console.log(`Low email confidence for ${profile.name}, trying alternatives...`);
          
          // Try to find better email using company domain
          const betterEmail = await findBetterEmail(profile, apolloApiKey);
          if (betterEmail) {
            enrichmentResult.verifiedEmail = betterEmail.email;
            enrichmentResult.emailAccuracy = betterEmail.accuracy;
            enrichmentResult.emailSource = betterEmail.source;
          }
        }
        
        enrichedProfiles.push(enrichmentResult);
        
      } catch (error) {
        console.error(`Error enriching ${profile.name}:`, error.message);
        enrichedProfiles.push({
          ...profile,
          apolloEnriched: false,
          apolloError: error.message
        });
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1200));
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        profiles: enrichedProfiles,
        count: enrichedProfiles.length,
        emailStats: {
          total: enrichedProfiles.length,
          withEmail: enrichedProfiles.filter(p => p.verifiedEmail).length,
          highConfidence: enrichedProfiles.filter(p => p.emailAccuracy === 'high').length,
          verified: enrichedProfiles.filter(p => p.emailStatus === 'verified').length
        }
      })
    };

  } catch (error) {
    console.error('Apollo function error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        success: false, 
        error: `Contact enrichment failed: ${error.message}`
      })
    };
  }
};

// MAIN ENRICHMENT FUNCTION
async function enhanceWithApollo(profile, apiKey) {
  // First, try to get company domain
  const companyDomain = await getCompanyDomain(profile.company, apiKey);
  
  const payload = {
    first_name: extractFirstName(profile.name),
    last_name: extractLastName(profile.name),
    reveal_personal_emails: true,
    reveal_phone_number: true,
    webhook_url: ''
  };

  // Add company information if available
  if (profile.company && profile.company !== 'LinkedIn Profile') {
    payload.organization_name = profile.company;
  }
  
  if (companyDomain) {
    payload.domain = companyDomain;
  }
  
  if (profile.profileUrl) {
    payload.linkedin_url = profile.profileUrl;
  }

  const response = await fetch('https://api.apollo.io/api/v1/people/match', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Apollo API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.person) {
    const person = data.person;
    
    return {
      ...profile,
      apolloEnriched: true,
      apolloId: person.id,
      verifiedEmail: person.email,
      emailStatus: person.email_status,
      emailAccuracy: calculateEmailAccuracy(person),
      directPhone: person.phone_number || getBestPhone(person),
      company: person.organization_name || profile.company,
      title: person.title || profile.title,
      confidence: calculateOverallConfidence(person),
      hasEmail: !!person.email,
      hasDirectPhone: !!person.phone_number,
      source: 'apollo_direct',
      lastUpdated: person.updated_at
    };
  } else {
    // No direct match found
    return {
      ...profile,
      apolloEnriched: false,
      note: 'No exact match in Apollo database'
    };
  }
}

// GET COMPANY DOMAIN FOR BETTER EMAIL ACCURACY
async function getCompanyDomain(companyName, apiKey) {
  if (!companyName || companyName === 'LinkedIn Profile') return null;
  
  try {
    const response = await fetch('https://api.apollo.io/v1/organizations/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        q_organization_name: companyName,
        page: 1,
        per_page: 1
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.organizations && data.organizations.length > 0) {
        return data.organizations[0].website_url;
      }
    }
  } catch (error) {
    console.error('Company domain lookup failed:', error);
  }
  
  return null;
}

// ALTERNATIVE EMAIL FINDING STRATEGIES
async function findBetterEmail(profile, apiKey) {
  // Strategy: Search for people at the same company to guess email pattern
  try {
    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        q_organization_name: profile.company,
        page: 1,
        per_page: 5
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.people && data.people.length > 0) {
        // Analyze email patterns from other employees
        const emailPattern = analyzeEmailPattern(data.people);
        if (emailPattern) {
          const estimatedEmail = generateEmailFromPattern(profile.name, emailPattern);
          return {
            email: estimatedEmail,
            accuracy: 'medium',
            source: 'pattern_analysis'
          };
        }
      }
    }
  } catch (error) {
    console.error('Email pattern analysis failed:', error);
  }
  
  return null;
}

// HELPER FUNCTIONS
function extractFirstName(fullName) {
  if (!fullName) return '';
  return fullName.split(' ')[0];
}

function extractLastName(fullName) {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

function getBestPhone(person) {
  if (person.phone_number) return person.phone_number;
  if (person.phone_numbers && person.phone_numbers.length > 0) {
    // Prefer mobile numbers
    const mobile = person.phone_numbers.find(p => p.type === 'mobile');
    if (mobile) return mobile.sanitized_number;
    return person.phone_numbers[0].sanitized_number;
  }
  return null;
}

function calculateEmailAccuracy(person) {
  if (!person.email) return 'none';
  if (person.email_status === 'verified') return 'high';
  if (person.extrapolated_email_confidence) {
    if (person.extrapolated_email_confidence > 0.8) return 'high';
    if (person.extrapolated_email_confidence > 0.5) return 'medium';
  }
  return 'low';
}

function calculateOverallConfidence(person) {
  let score = 0;
  if (person.email) score += (calculateEmailAccuracy(person) === 'high' ? 3 : 1);
  if (person.phone_number) score += 3;
  if (person.organization_name) score += 2;
  if (person.title) score += 1;
  if (person.linkedin_url) score += 1;
  
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function analyzeEmailPattern(people) {
  const emails = people.map(p => p.email).filter(email => email && email.includes('@'));
  if (emails.length === 0) return null;
  
  // Simple pattern analysis (you can enhance this)
  const domains = [...new Set(emails.map(email => email.split('@')[1]))];
  if (domains.length === 1) {
    return {
      domain: domains[0],
      format: 'first.last' // Most common format
    };
  }
  return null;
}

function generateEmailFromPattern(name, pattern) {
  const firstName = extractFirstName(name).toLowerCase();
  const lastName = extractLastName(name).toLowerCase();
  
  if (pattern.format === 'first.last') {
    return `${firstName}.${lastName}@${pattern.domain}`;
  }
  // Add more patterns as needed
  
  return null;
}

// MOCK DATA GENERATORS (for demo mode)
function generateRealisticEmail(name, company) {
  if (!name || !company) return null;
  
  const firstName = extractFirstName(name).toLowerCase();
  const lastName = extractLastName(name).toLowerCase();
  const companySlug = company.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  const patterns = [
    `${firstName}.${lastName}@${companySlug}.com`,
    `${firstName}@${companySlug}.com`,
    `${firstName.charAt(0)}${lastName}@${companySlug}.com`,
    `${firstName}_${lastName}@${companySlug}.com`
  ];
  
  return patterns[Math.floor(Math.random() * patterns.length)];
}

function generateRealisticPhone(index) {
  const prefixes = ['555', '444', '333', '222'];
  const prefix = prefixes[index % prefixes.length];
  return `+1-${prefix}-${100 + index}-${1000 + index}`;
}