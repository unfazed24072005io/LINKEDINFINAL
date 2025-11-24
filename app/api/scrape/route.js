import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { designation, location } = await request.json();
    
    if (!designation?.trim() || !location?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Designation and location are required' },
        { status: 400 }
      );
    }

    // Real Oxylabs API call
    const searchQuery = `site:linkedin.com/in "${designation}" "${location}"`;
    
    const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from(
          `${process.env.OXYLABS_USERNAME}:${process.env.OXYLABS_PASSWORD}`
        ).toString('base64')
      },
      body: JSON.stringify({
        source: 'google_search',
        query: searchQuery,
        parse: true,
        limit: 20,
        context: [
          { key: 'follow_redirects', value: true },
          { key: 'location', value: 'United States' }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Oxylabs API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Extract LinkedIn profiles from results
    const profiles = extractLinkedInProfiles(data, designation, location);
    
    if (profiles.length === 0) {
      return NextResponse.json({
        success: true,
        profiles: [],
        count: 0,
        note: 'No LinkedIn profiles found for this search'
      });
    }
    
    return NextResponse.json({
      success: true,
      profiles: profiles,
      count: profiles.length
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Scraping failed: ${error.message}`,
        note: 'Check your API credentials and internet connection'
      },
      { status: 500 }
    );
  }
}

function extractLinkedInProfiles(oxylabsData, designation, location) {
  const profiles = [];
  
  if (!oxylabsData.results || !oxylabsData.results[0]?.content?.results?.organic) {
    return profiles;
  }

  const organicResults = oxylabsData.results[0].content.results.organic;
  
  organicResults.forEach((result, index) => {
    if (result.url.includes('linkedin.com/in/')) {
      const profile = {
        id: index + 1,
        name: extractNameFromTitle(result.title),
        title: designation,
        company: extractCompanyFromSnippet(result.snippet) || 'Not specified',
        location: location,
        profileUrl: result.url,
        email: null, // Will be filled by Apollo
        phone: null, // Will be filled by Apollo
        snippet: result.snippet,
        linkedinVerified: true
      };
      
      profiles.push(profile);
    }
  });

  return profiles;
}

function extractNameFromTitle(title) {
  // Extract name from LinkedIn title format
  const nameMatch = title.match(/(.*?) - (.*?) \| LinkedIn/);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1].trim();
  }
  
  // Fallback: remove LinkedIn suffix and clean up
  return title.replace(' | LinkedIn', '')
             .replace(' on LinkedIn: ', '')
             .trim();
}

function extractCompanyFromSnippet(snippet) {
  const companyMatch = snippet.match(/at\s+([^.,]+)/i);
  return companyMatch ? companyMatch[1].trim() : null;
}